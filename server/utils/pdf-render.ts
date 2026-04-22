import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';

let puppeteerCore: typeof import('puppeteer-core') | null = null;

async function getPuppeteer() {
  if (!puppeteerCore) {
    puppeteerCore = await import('puppeteer-core');
  }
  return puppeteerCore.default;
}

function getChromePath(): string {
  const envPath = process.env.CHROMIUM_EXECUTABLE_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  const defaultPath =
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (existsSync(defaultPath)) return defaultPath;

  throw createError({
    statusCode: 503,
    message: 'Chrome not found. Set CHROMIUM_EXECUTABLE_PATH.'
  });
}

export async function renderPdfWithBorder(html: string): Promise<Buffer> {
  const puppeteer = await getPuppeteer();
  const executablePath = getChromePath();

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ],
    executablePath,
    headless: true
  });

  try {
    const page = await browser.newPage();
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'networkidle0' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.evaluate(() => (globalThis as any).document.fonts.ready);

    const rawPdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
    });

    // Draw 4mm teal border on every page (matching resume)
    const pdfDoc = await PDFDocument.load(rawPdf);
    const borderWidth = (4 * 72) / 25.4; // 4mm in pt
    const borderInset = borderWidth / 2;
    const borderColor = rgb(58 / 255, 158 / 255, 174 / 255); // #3a9eae

    for (const pg of pdfDoc.getPages()) {
      const { width, height } = pg.getSize();
      pg.drawRectangle({
        x: borderInset,
        y: borderInset,
        width: width - borderInset * 2,
        height: height - borderInset * 2,
        borderColor,
        borderWidth,
        color: undefined
      });
    }

    const pdf = await pdfDoc.save();
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// Resume JSON loader (cached)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedResumeJson: Record<string, any> | null = null;

export function invalidateResumeCache() {
  cachedResumeJson = null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getResumeJson(): Record<string, any> {
  if (cachedResumeJson) return cachedResumeJson;
  const resumePath = resolve(
    process.cwd(),
    'content/giancarlo_papa_resume.json'
  );
  cachedResumeJson = JSON.parse(readFileSync(resumePath, 'utf-8'));
  return cachedResumeJson!;
}
