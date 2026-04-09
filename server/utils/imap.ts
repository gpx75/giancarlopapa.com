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

export interface FetchImapOptions {
  limit?: number;
  /**
   * Restrict to messages whose To/Cc/Bcc contains at least one recipient
   * under the given domain (e.g. 'giancarlopapa.com'). IMAP SEARCH narrows
   * the fetch server-side; a post-fetch check guards against false positives.
   */
  toDomain?: string;
}

export async function fetchImapMessages(
  email: string,
  password: string,
  options: FetchImapOptions = {}
): Promise<ImapMessage[]> {
  const { limit = 30, toDomain } = options;

  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: password },
    logger: false
  });

  await client.connect();
  const messages: ImapMessage[] = [];

  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const range = await resolveFetchRange(client, { limit, toDomain });
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
  { limit, toDomain }: { limit: number; toDomain?: string }
): Promise<string | number[] | null> {
  if (toDomain) {
    const uids = await client.search({ to: `@${toDomain}` }, { uid: true });
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
