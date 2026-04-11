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
   * Restrict to messages whose To/Cc/Bcc contains at least one recipient
   * under the given domain (e.g. 'giancarlopapa.com'). IMAP SEARCH narrows
   * the fetch server-side; a post-fetch check guards against false positives.
   *
   * On Gmail, uses the X-GM-RAW extension for the fastest possible search
   * (Gmail's native query language is fully indexed and far outpaces RFC
   * SEARCH on large mailboxes), constrained to the last year.
   */
  toDomain?: string;
}

export async function fetchImapMessages(
  conn: ImapConnection,
  options: FetchImapOptions = {}
): Promise<ImapMessage[]> {
  const { limit = 30, toDomain } = options;

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
    const lock = await client.getMailboxLock('INBOX');
    try {
      const range = await resolveFetchRange(client, {
        limit,
        toDomain,
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
          if (toDomain && !hasRecipientInDomain(parsed, toDomain)) continue;

          const from = parsed.from?.value[0];
          messages.push({
            id: parsed.messageId ?? `uid-${msg.uid}`,
            uid: msg.uid,
            subject: parsed.subject ?? '(no subject)',
            fromName: from?.name ?? from?.address ?? '',
            fromEmail: from?.address ?? '',
            bodyText: parsed.text ?? '',
            bodyHtml: typeof parsed.html === 'string' ? parsed.html : '',
            receivedAt: (parsed.date ?? new Date()).toISOString()
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

async function resolveFetchRange(
  client: ImapFlow,
  { limit, toDomain, isGmail }: { limit: number; toDomain?: string; isGmail: boolean }
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

  const status = await client.status('INBOX', { messages: true });
  const total = status.messages ?? 0;
  if (total === 0) return null;
  const start = Math.max(1, total - limit + 1);
  return `${start}:*`;
}

function hasRecipientInDomain(parsed: ParsedMail, domain: string): boolean {
  const suffix = `@${domain.toLowerCase()}`;
  const fields: (AddressObject | AddressObject[] | undefined)[] = [
    parsed.to,
    parsed.cc,
    parsed.bcc
  ];

  for (const field of fields) {
    if (!field) continue;
    const list = Array.isArray(field) ? field : [field];
    for (const group of list) {
      for (const addr of group.value) {
        if (addr.address?.toLowerCase().endsWith(suffix)) return true;
      }
    }
  }
  return false;
}
