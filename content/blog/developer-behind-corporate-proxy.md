---
title: 'Developer Behind a Corporate Proxy: A Survival Guide'
description: 'NTLM authentication, certificate inspection, DNS switching, and a Fish shell function that keeps every tool — npm, git, gcloud, Python — working inside and outside the corporate network.'
date: '2026-03-04'
tags:
  [
    'proxy',
    'devex',
    'cntlm',
    'fish',
    'security',
    'linux',
    'networking'
  ]
draft: false
---

Every developer who has ever worked inside a large enterprise knows the feeling: you clone a repo, run `npm install`, and stare at a cascade of `ECONNREFUSED` errors. Welcome to the corporate proxy.

This post is not a rant. It is a breakdown of how I actually solved it — completely, across every tool I use — and packaged it into a single Fish shell function I can toggle on and off with `proxy on` and `proxy off`.

---

## The Problem

Corporate networks commonly route all outbound traffic through a **forward proxy** that requires NTLM authentication — the Windows-native challenge-response authentication protocol. Most developer tooling (npm, git, curl, pip, gcloud) supports HTTP proxies natively, but almost none of them can negotiate NTLM on their own.

On top of that, the proxy performs **TLS inspection**: it terminates your HTTPS connections, inspects the traffic, then re-encrypts with the corporate root CA certificate. Tools that ship with their own bundled CA stores (Node.js, Python's `requests`, Go's `net/http`) reject these re-signed certificates and throw `CERTIFICATE_VERIFY_FAILED` or `unable to get local issuer certificate`.

The situation looks like this:

```
your tool → CNTLM (localhost:3128) → corporate proxy (NTLM auth) → internet
               ↕
         corporate root CA
         re-signs TLS certs
```

You have two distinct problems to solve:
1. **Authentication**: speak NTLM on behalf of every tool
2. **Certificate trust**: make every tool accept the corporate CA chain

---

## The Solution Stack

### CNTLM — NTLM Authentication Proxy

[CNTLM](http://cntlm.sourceforge.net/) is a local proxy that handles NTLM negotiation for you. It runs on `localhost:3128` (HTTP) and `localhost:1080` (SOCKS5) and presents a simple unauthenticated endpoint to your tools. You configure your corporate credentials and upstream proxy once in `/etc/cntlm.conf`, and CNTLM handles the rest.

```ini
# /etc/cntlm.conf (simplified)
Username    your.username
Domain      CORPORATE
Proxy       proxy.corporate.internal:8080
Listen      3128
```

Once running, every tool just points to `http://127.0.0.1:3128` and forgets NTLM exists.

### Corporate Root CA

The corporate CA certificate needs to be trusted at the OS level and explicitly injected into every runtime that ships its own CA bundle. I install it once with a `proxy trust <cert-file>` command that:

1. Copies it to `~/.certs/` for per-tool use
2. Installs it system-wide via `update-ca-certificates`

### Certificate Bundle

For tools that need an explicit CA file path (npm's `cafile`, Composer's `cafile`, Python's `SSL_CERT_FILE`), I build a combined PEM bundle at `~/.certs/proxy-bundle.pem`:

- Mozilla CA store (from `curl.se/ca/cacert.pem` or the system store)
- The corporate root CA
- Intermediate certificates extracted live from key registries via `openssl s_client`

The live extraction step matters: corporate proxies often sign with intermediate CAs not in the Mozilla bundle. I pull the full chain from `registry.npmjs.org`, `api.github.com`, and `repo.packagist.org` and append them.

```fish
echo | openssl s_client -showcerts -connect registry.npmjs.org:443 -proxy 127.0.0.1:3128 2>/dev/null \
  | awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/' >> ~/.certs/proxy-bundle.pem
```

---

## The Fish Function

I wrapped the entire setup in a single Fish function with four subcommands:

```
proxy on             # full setup: CNTLM, DNS, certs, all tool configs
proxy on --env-only  # only export env vars (CNTLM already running)
proxy off            # full teardown and DNS restore
proxy status         # diagnostic overview
proxy trust <file>   # install a corporate CA cert
```

### `proxy on` — what it does

**1. VPN detection**

Before doing anything, it checks whether an internal host is reachable. If you're not on VPN (or not physically in the office), there's nothing to proxy through. The `--force` flag bypasses this check for edge cases.

**2. Start CNTLM**

```fish
sudo systemctl start cntlm
```

Idempotent — skipped if already running.

**3. Switch DNS**

On VPN, internal hostnames need to resolve via the corporate DNS. I back up `/etc/resolv.conf` and replace it with the internal nameserver. On `proxy off`, the backup is restored.

**4. Build the certificate bundle**

As described above — base CA store + corporate root + live-extracted intermediates.

**5. Export environment variables**

The full set that covers every tool I know of:

```fish
set -gx http_proxy  http://127.0.0.1:3128
set -gx https_proxy http://127.0.0.1:3128
set -gx no_proxy    "localhost,127.0.0.1,::1,10.*,192.168.*"
set -gx all_proxy   socks5h://127.0.0.1:1080
set -gx ftp_proxy   http://127.0.0.1:3128
set -gx rsync_proxy http://127.0.0.1:3128

# TLS cert bundle for OpenSSL-based tools (Python, curl, etc.)
set -gx SSL_CERT_FILE      ~/.certs/proxy-bundle.pem
set -gx REQUESTS_CA_BUNDLE ~/.certs/proxy-bundle.pem

# Node.js — extra CA certs injected alongside the built-in bundle
set -gx NODE_EXTRA_CA_CERTS ~/.certs/corporate-node-chain.pem
```

Both lowercase and uppercase variants are exported — different tools check different casing.

**6. Configure tools persistently**

Environment variables apply to the current shell session. But some tools read their own config files, so I configure those explicitly:

```fish
# npm
npm config set proxy        http://127.0.0.1:3128
npm config set https-proxy  http://127.0.0.1:3128
npm config set cafile        ~/.certs/proxy-bundle.pem
npm config set strict-ssl   false

# git
git config --global http.proxy  socks5h://127.0.0.1:1080
git config --global https.proxy socks5h://127.0.0.1:1080
git config --global http.sslVerify false

# gcloud (uses SOCKS5)
gcloud config set proxy/type    socks5
gcloud config set proxy/address 127.0.0.1
gcloud config set proxy/port    1080
gcloud config set proxy/rdns    true

# apt
echo 'Acquire::http::Proxy "http://127.0.0.1:3128";' \
  | sudo tee /etc/apt/apt.conf.d/80proxy

# Composer (PHP)
composer config -g cafile ~/.certs/proxy-bundle.pem
```

Git uses SOCKS5 rather than HTTP proxy because it handles the CONNECT tunnelling better for SSH-over-HTTPS scenarios.

### `proxy off` — clean teardown

Everything is reversed:

- Env vars are unset (`set -e`)
- npm, git, gcloud configs are deleted/reset
- `/etc/apt/apt.conf.d/80proxy` is removed
- `resolv.conf` is restored from backup (or falls back to `8.8.8.8`)
- CNTLM is stopped

The `NODE_OPTIONS` variable is special — it may have been set before `proxy on`, so I save it to a file on `on` and restore it on `off` rather than blindly deleting it.

---

## The Node.js Problem

Node.js has a frustrating trust model. Unlike Go or Python, it does not use the system CA store by default — it ships its own compiled-in bundle. `NODE_EXTRA_CA_CERTS` adds CAs on top of the built-in ones, which works for most cases.

But there is a wrinkle: **undici**, Node's built-in HTTP client (used by `fetch()` since Node 18), does not respect `http_proxy` env vars. It requires explicit proxy configuration in code or at the process level.

My workaround is a small CommonJS module injected via `NODE_OPTIONS`:

```fish
set -gx NODE_OPTIONS "--require=/path/to/undici-proxy.cjs"
```

The module patches `undici`'s `setGlobalDispatcher` to route through the CNTLM proxy. It's ugly, but it means `fetch()` just works without touching application code.

---

## `proxy status` — diagnostics

When something breaks, `proxy status` gives a quick overview:

```
🔎 Proxy status:
  • CNTLM: running
  • http_proxy:          http://127.0.0.1:3128
  • https_proxy:         http://127.0.0.1:3128
  • SSL_CERT_FILE:       /home/user/.certs/proxy-bundle.pem
  • NODE_EXTRA_CA_CERTS: /home/user/.certs/corporate-node-chain.pem
  • DNS servers:
      nameserver 10.x.x.x
  • VPN / internal DNS: reachable ✅
```

---

## Lessons Learned

**NTLM is the real blocker.** Everything else is solvable with env vars. CNTLM is the only sane solution — do not try to configure NTLM credentials in individual tools.

**TLS inspection breaks more things than you expect.** Node.js, Python, Go, and Java all maintain their own CA stores. You have to inject the corporate CA into each one separately. A single PEM bundle you can point everything at helps enormously.

**`sslVerify false` is a band-aid.** I use it for npm and git because cert validation against a dynamic, tool-maintained bundle is fragile. In a properly set up environment you'd use `cafile` everywhere instead. But `strict-ssl false` is pragmatic when the alternative is spending a week debugging certificate chain issues across every tool version.

**DNS is often overlooked.** When you're on a corporate VPN, internal hostnames only resolve via the corporate DNS. Switching `/etc/resolv.conf` automatically (with backup/restore) eliminates a whole class of "host not found" errors.

**Idempotency and reversibility matter.** `proxy on` can be run multiple times without side effects. `proxy off` fully restores the pre-proxy state. This makes it safe to call from scripts or forget you already ran it.

---

## The Full Function

The complete `proxy.fish` function is [in my dotfiles](https://github.com/gpx75/dotfiles) if you want to adapt it. The key design decisions:

- Single entry point, multiple subcommands — one function to learn
- VPN detection before doing anything — fails fast with a clear message
- State persistence via `~/.config/proxy-state/` — survives across toggles
- Explicit tool configuration, not just env vars — covers tools that ignore env vars
- `--env-only` flag — for when CNTLM is already running and you just need a new shell configured

If you work in a corporate environment and spend more than ten minutes a day fighting proxy issues, building a function like this is worth the afternoon it takes. The cognitive overhead of remembering what to set before `npm install` adds up fast.

---

*Have a better approach to the undici proxy problem, or a tool I'm missing? I'd love to hear about it — reach me via the [contact form](/contact).*
