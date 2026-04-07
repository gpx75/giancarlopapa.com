import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';

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

export async function fetchImapMessages(
  email: string,
  password: string,
  limit = 30
): Promise<ImapMessage[]> {
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
      const status = await client.status('INBOX', { messages: true });
      const total = status.messages ?? 0;
      if (total === 0) return [];

      const start = Math.max(1, total - limit + 1);

      for await (const msg of client.fetch(`${start}:*`, {
        uid: true,
        envelope: true,
        source: true
      })) {
        if (!msg.source) continue;
        try {
          const parsed: ParsedMail = await simpleParser(msg.source);
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
