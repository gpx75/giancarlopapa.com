---
title: "The Perfect Terminal: Fish, Starship & Snazzy on macOS, Linux, and Windows"
description: "How I set up Fish shell, Starship prompt, and the Snazzy colour scheme in Ghostty on macOS, GNOME Terminal on Fedora, and Windows Terminal — so every machine feels like home."
date: "2026-02-22"
tags: ["terminal", "fish", "starship", "snazzy", "ghostty", "windows-terminal", "fedora"]
---

I spend most of my day in a terminal. Across three operating systems — macOS, Fedora Linux, and Windows — I've settled on a setup that looks identical everywhere: **Fish shell**, **Starship prompt**, and the **Snazzy** colour scheme. This post walks through how to get there on each platform.

---

## Why Snazzy?

[Snazzy](https://github.com/sindresorhus/hyper-snazzy) is a terminal theme by Sindre Sorhus, originally for Hyper. Its palette is bold but not distracting — a dark near-black background (`#282a36`), soft white foreground, and accent colours that pop just enough: magenta (`#ff6ac1`), green (`#5af78e`), yellow (`#f3f99d`), and cyan (`#9aedfe`).

It's been my daily driver for years, and it's the palette this very site is built on.

---

## macOS — Ghostty + Fish + Starship

[Ghostty](https://ghostty.org) is the terminal emulator I use on macOS. It's fast, native, and supports themes out of the box.

### Install Ghostty

Download the latest release from [ghostty.org](https://ghostty.org) and move it to `/Applications`. Then open it once to allow macOS to trust the binary.

### Apply Snazzy theme

Ghostty ships Snazzy as a built-in theme. Add this to `~/.config/ghostty/config`:

```
theme = Snazzy
font-family = JetBrains Mono
font-size = 13
```

### Install Fish

```bash
brew install fish
```

Set it as your default shell:

```bash
echo /opt/homebrew/bin/fish | sudo tee -a /etc/shells
chsh -s /opt/homebrew/bin/fish
```

### Install Starship

```bash
brew install starship
```

Add to `~/.config/fish/config.fish`:

```fish
starship init fish | source
```

Restart Ghostty. You'll have a clean, instant prompt that adapts to every project type.

---

## Linux (Fedora) — GNOME Terminal + Fish + Starship

On Fedora, I use GNOME Terminal with a manually applied Snazzy palette.

### Apply Snazzy to GNOME Terminal

Install `gogh`, the terminal colour scheme installer:

```bash
bash -c "$(wget -qO- https://git.io/vQgMr)"
```

Search for **Snazzy** in the list and select it. Alternatively, set the colours manually via **Preferences → Profile → Colours**:

| Role | Hex |
|------|-----|
| Background | `#282a36` |
| Foreground | `#eff0eb` |
| Black | `#282a36` |
| Red | `#ff5c57` |
| Green | `#5af78e` |
| Yellow | `#f3f99d` |
| Blue | `#57c7ff` |
| Magenta | `#ff6ac1` |
| Cyan | `#9aedfe` |
| White | `#f1f1f0` |

### Install Fish on Fedora

```bash
sudo dnf install fish
chsh -s /usr/bin/fish
```

### Install Starship on Fedora

```bash
curl -sS https://starship.rs/install.sh | sh
```

Add to `~/.config/fish/config.fish`:

```fish
starship init fish | source
```

---

## Windows — Windows Terminal + Fish (WSL2) + Starship

On Windows I run Fish inside WSL2 (Ubuntu or Fedora Remix). Windows Terminal handles the colours.

### Apply Snazzy to Windows Terminal

Open Windows Terminal settings (`Ctrl+,`), go to **Open JSON file**, and add this to the `schemes` array:

```json
{
  "name": "Snazzy",
  "background": "#282A36",
  "foreground": "#EFF0EB",
  "black": "#282A36",
  "red": "#FF5C57",
  "green": "#5AF78E",
  "yellow": "#F3F99D",
  "blue": "#57C7FF",
  "purple": "#FF6AC1",
  "cyan": "#9AEDFE",
  "white": "#F1F1F0",
  "brightBlack": "#686868",
  "brightRed": "#FF5C57",
  "brightGreen": "#5AF78E",
  "brightYellow": "#F3F99D",
  "brightBlue": "#57C7FF",
  "brightPurple": "#FF6AC1",
  "brightCyan": "#9AEDFE",
  "brightWhite": "#F1F1F0",
  "cursorColor": "#97979B",
  "selectionBackground": "#3E404A"
}
```

Then in your WSL2 profile, set `"colorScheme": "Snazzy"`.

### Install Fish inside WSL2

```bash
sudo apt install fish   # Ubuntu
# or
sudo dnf install fish   # Fedora Remix
chsh -s /usr/bin/fish
```

### Install Starship inside WSL2

```bash
curl -sS https://starship.rs/install.sh | sh
```

Add to `~/.config/fish/config.fish`:

```fish
starship init fish | source
```

---

## Shared Starship config

I keep a single `~/.config/starship.toml` synced across machines (via a dotfiles repo). Here's the core of it — minimal, Snazzy-coloured:

```toml
format = """
$directory\
$git_branch\
$git_status\
$cmd_duration\
$line_break\
$character"""

[directory]
style = "bold #ff6ac1"
truncation_length = 3
truncate_to_repo = true

[git_branch]
symbol = " "
style = "#5af78e"
format = "on [$symbol$branch]($style) "

[git_status]
style = "#f3f99d"
format = "([$all_status$ahead_behind]($style) )"

[character]
success_symbol = "[❯](bold #5af78e)"
error_symbol = "[❯](bold #ff5c57)"

[cmd_duration]
min_time = 2_000
format = "took [$duration](#9aedfe) "
```

The colours map directly to the Snazzy palette — prompt character in green, branch in green, git status in yellow, directory in magenta.

---

## End result

Every terminal I open, on any machine, greets me with the same dark background, the same colours, the same prompt shape. It's a small thing, but consistency across environments genuinely reduces cognitive load.

If you're not already version-controlling your dotfiles, this is the perfect excuse to start. I use a bare git repo — one `git clone` and a handful of symlinks, and a new machine is home in minutes.
