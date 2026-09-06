import { ImapFlow } from 'imapflow';
import { simpleParser, type AddressObject, type ParsedMail } from 'mailparser';

export interface ImapMessage {
  id: string;
  uid: number;
  subject: string;
  fromName: string;
  fromEmail: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: string;
  folder: string;
}

export interface ImapConnection {
  host: string;
  port?: number;
  secure?: boolean;
  user: string;
  pass: string;
}

export interface FetchImapOptions {
  limit?: number;
  /**
   * Restrict to messages whose **To** header contains at least one recipient
   * under the given domain (e.g. 'giancarlopapa.com'). IMAP SEARCH narrows
   * the fetch server-side; a post-fetch check on parsed.to guards against
   * false positives. Cc/Bcc are intentionally ignored — the admin inbox is
   * for mail directly addressed to the domain, not threads where the domain
   * is merely copied.
   *
   * On Gmail, uses the X-GM-RAW extension for the fastest possible search
   * (Gmail's native query language is fully indexed and far outpaces RFC
   * SEARCH on large mailboxes), constrained to the last year.
   */
  toDomain?: string;
  /** Restrict to messages whose **From** header matches the domain. Used for sent mail. */
  fromDomain?: string;
  /** IMAP folder to fetch from (default: 'INBOX'). Used as-is unless `specialUse` resolves a different path. */
  folder?: string;
  /**
   * Resolve the folder by IMAP SPECIAL-USE flag (e.g. '\\Sent') instead of the
   * literal `folder` path. Gmail's `[Gmail]/...` folder names are localized
   * per account (e.g. Italian accounts use "Posta inviata", not "Sent Mail"),
   * so special-use flags are the only locale-independent way to find them.
   * Falls back to `folder` if no mailbox reports the flag.
   */
  specialUse?: string;
}

export async function fetchImapMessages(
  conn: ImapConnection,
  options: FetchImapOptions = {}
): Promise<ImapMessage[]> {
  const { limit = 30, toDomain, fromDomain, folder = 'INBOX', specialUse } = options;

  const client = new ImapFlow({
    host: conn.host,
    port: conn.port ?? 993,
    secure: conn.secure ?? true,
    auth: { user: conn.user, pass: conn.pass },
    logger: false
  });

  await client.connect();
  const messages: ImapMessage[] = [];

  try {
    const resolvedFolder = specialUse
      ? await resolveMailboxBySpecialUse(client, specialUse, folder)
      : folder;
    const lock = await client.getMailboxLock(resolvedFolder);
    try {
      const range = await resolveFetchRange(client, {
        limit,
        toDomain,
        fromDomain,
        isGmail: conn.host === 'imap.gmail.com'
      });
      if (!range) return [];

      for await (const msg of client.fetch(range, {
        uid: true,
        envelope: true,
        source: true
      }, { uid: true })) {
        if (!msg.source) continue;
        try {
          const parsed: ParsedMail = await simpleParser(msg.source);
          if (toDomain && !hasToInDomain(parsed, toDomain)) continue;
          if (fromDomain && !hasFromInDomain(parsed, fromDomain)) continue;

          const from = parsed.from?.value[0];
          messages.push({
            id: parsed.messageId ?? `uid-${msg.uid}`,
            uid: msg.uid,
            subject: parsed.subject ?? '(no subject)',
            fromName: from?.name ?? from?.address ?? '',
            fromEmail: from?.address ?? '',
            bodyText: parsed.text ?? '',
            bodyHtml: typeof parsed.html === 'string' ? parsed.html : '',
            receivedAt: (parsed.date ?? new Date()).toISOString(),
            folder
          });
        } catch {
          // skip unparseable messages
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return messages.reverse();
}

async function resolveMailboxBySpecialUse(
  client: ImapFlow,
  specialUse: string,
  fallback: string
): Promise<string> {
  const mailboxes = await client.list();
  const match = mailboxes.find(mb => mb.specialUse === specialUse);
  return match?.path ?? fallback;
}

async function resolveFetchRange(
  client: ImapFlow,
  { limit, toDomain, fromDomain, isGmail }: { limit: number; toDomain?: string; fromDomain?: string; isGmail: boolean }
): Promise<string | number[] | null> {
  if (toDomain) {
    // Gmail fast path: native search syntax via X-GM-RAW is fully indexed
    // and stays near-instant even on huge mailboxes. Cap at 1 year to keep
    // the search bounded — admin inbox is for active triage, not archival.
    const searchQuery = isGmail
      ? { gmailRaw: `to:@${toDomain} newer_than:1y` }
      : { to: `@${toDomain}` };

    const uids = await client.search(searchQuery, { uid: true });
    if (!uids || uids.length === 0) return null;
    return uids.slice(-limit);
  }

  if (fromDomain) {
    const searchQuery = isGmail
      ? { gmailRaw: `from:@${fromDomain} newer_than:1y` }
      : { from: `@${fromDomain}` };

    const uids = await client.search(searchQuery, { uid: true });
    if (!uids || uids.length === 0) return null;
    return uids.slice(-limit);
  }

  const status = await client.status('INBOX', { messages: true });
  const total = status.messages ?? 0;
  if (total === 0) return null;
  const start = Math.max(1, total - limit + 1);
  return `${start}:*`;
}

/**
 * Strict check: only returns true if the message's **To** header contains at
 * least one recipient under `domain`. Cc/Bcc are deliberately ignored so
 * threads that merely copy a domain address don't pollute the admin inbox.
 */
function hasToInDomain(parsed: ParsedMail, domain: string): boolean {
  const suffix = `@${domain.toLowerCase()}`;
  const field: AddressObject | AddressObject[] | undefined = parsed.to;
  if (!field) return false;

  const list = Array.isArray(field) ? field : [field];
  for (const group of list) {
    for (const addr of group.value) {
      if (addr.address?.toLowerCase().endsWith(suffix)) return true;
    }
  }
  return false;
}

function hasFromInDomain(parsed: ParsedMail, domain: string): boolean {
  const suffix = `@${domain.toLowerCase()}`;
  const from = parsed.from;
  if (!from) return false;
  for (const addr of from.value) {
    if (addr.address?.toLowerCase().endsWith(suffix)) return true;
  }
  return false;
}
