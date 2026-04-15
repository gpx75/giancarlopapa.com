function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface CoverLetterHtmlOptions {
  content: string;
  company: string;
  position: string;
  contactEmail: string | null;
  basics: {
    name: string;
    email: string;
    phone: string;
    url: string;
    location: { city: string; region: string; countryCode: string; postalCode: string };
    profiles: Array<{ network: string; url: string }>;
  };
}

export function buildCoverLetterHtml(opts: CoverLetterHtmlOptions): string {
  const { content, company, position, basics } = opts;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const githubProfile = basics.profiles.find(p => p.network === 'GitHub');
  const linkedinProfile = basics.profiles.find(p => p.network === 'LinkedIn');

  // Split content into paragraphs
  const paragraphs = content
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  // Detect salutation and closing — first line starting with "Dear" and last line like "Sincerely,"
  let salutation = '';
  let closing = '';
  let bodyParagraphs = [...paragraphs];

  if (bodyParagraphs[0] && /^(dear|to whom)/i.test(bodyParagraphs[0])) {
    salutation = bodyParagraphs.shift()!;
  }

  const lastP = bodyParagraphs[bodyParagraphs.length - 1] ?? '';
  if (/^(sincerely|regards|best|warm|kind|yours|thank)/i.test(lastP)) {
    closing = bodyParagraphs.pop()!;
  }

  // If closing contains the name on a separate line, split it
  const closingLines = closing.split('\n').map(l => l.trim()).filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:ital,wght@0,400;0,700;1,400&display=swap');
  @page { size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { height: auto; }
  body {
    font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
    font-size: 10pt;
    color: #1a1a2e;
    line-height: 1.45;
    background: white;
  }

  /* ── Accent bar (top) ── */
  .accent-bar {
    height: 3px;
    background: linear-gradient(90deg, #2a7a8a 0%, #3a9eae 100%);
    margin-bottom: 10px;
    border-radius: 1px;
  }

  /* ── Header ── */
  .header {
    margin-bottom: 16px;
  }
  .name {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 16pt;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.2;
    margin-bottom: 2px;
  }
  .name .first { color: #3a9eae; }
  .title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 10pt;
    font-weight: 400;
    color: #3a9eae;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }
  .contact-line {
    font-size: 9pt;
    color: #64748b;
    line-height: 1.5;
    margin-bottom: 1px;
  }
  .contact-item { white-space: nowrap; }
  .contact-item + .contact-item::before { content: '  ·  '; color: #94a3b8; }

  /* ── Divider ── */
  .divider {
    width: 100%;
    height: 1px;
    background: #cbd5e1;
    margin: 12px 0;
  }

  /* ── Date & recipient ── */
  .date {
    font-size: 10pt;
    color: #64748b;
    margin-bottom: 8px;
  }
  .recipient {
    font-size: 10pt;
    color: #334155;
    margin-bottom: 4px;
    font-weight: 700;
  }
  .re-line {
    font-size: 10pt;
    color: #3a9eae;
    font-weight: 700;
    margin-bottom: 12px;
  }

  /* ── Salutation ── */
  .salutation {
    font-size: 10pt;
    color: #0f172a;
    font-weight: 700;
    margin-bottom: 10px;
  }

  /* ── Body ── */
  .body-paragraph {
    font-size: 10pt;
    color: #334155;
    line-height: 1.45;
    margin-bottom: 8px;
    text-align: justify;
  }

  /* ── Closing ── */
  .closing {
    margin-top: 14px;
    font-size: 10pt;
    color: #0f172a;
    line-height: 1.6;
  }
  .closing .sign-name {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    color: #0f172a;
    margin-top: 2px;
  }
</style>
</head>
<body>
  <div class="accent-bar"></div>

  <div class="header">
    <div class="name"><span class="first">${esc(basics.name.split(' ')[0] ?? '')}</span> ${esc(basics.name.split(' ').slice(1).join(' '))}</div>
    <div class="title">Senior Full Stack Engineer</div>
    <div class="contact-line">
      <span class="contact-item"><strong>Email:</strong> ${esc(basics.email)}</span>
      <span class="contact-item"><strong>Phone:</strong> ${esc(basics.phone)}</span>
      <span class="contact-item"><strong>Web:</strong> ${esc(basics.url.replace('https://', ''))}</span>
    </div>
    <div class="contact-line">
      <span class="contact-item"><strong>Location:</strong> ${esc(`${basics.location.postalCode} ${basics.location.city}, ${basics.location.region} — ${basics.location.countryCode}`)}</span>
      ${githubProfile ? `<span class="contact-item"><strong>GitHub:</strong> ${esc(githubProfile.url.replace('https://', ''))}</span>` : ''}
      ${linkedinProfile ? `<span class="contact-item"><strong>LinkedIn:</strong> ${esc(linkedinProfile.url.replace('https://', ''))}</span>` : ''}
    </div>
  </div>

  <div class="divider"></div>

  <div class="date">${esc(today)}</div>
  <div class="re-line">Re: ${esc(position)} — ${esc(company)}</div>

  ${salutation ? `<div class="salutation">${esc(salutation)}</div>` : ''}

  ${bodyParagraphs.map(p => `<p class="body-paragraph">${esc(p)}</p>`).join('\n  ')}

  ${closingLines.length ? `
  <div class="closing">
    ${closingLines.map((line, i) =>
      i === closingLines.length - 1 && line.includes(basics.name.split(' ')[0] ?? '')
        ? `<div class="sign-name">${esc(line)}</div>`
        : `<div>${esc(line)}</div>`
    ).join('\n    ')}
  </div>` : ''}
</body>
</html>`;
}
