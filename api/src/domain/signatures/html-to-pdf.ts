import { chromium, type Browser } from 'playwright';

export interface SignatureFieldPlacement {
  key: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderHtmlToPdfResult {
  pdfBuffer: Buffer;
  placements: SignatureFieldPlacement[];
}

const DOCUMENT_CSS = `
  body {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #1a1a1a;
    margin: 0;
    padding: 40px;
  }
  h1, h2, h3 { margin-top: 1.2em; margin-bottom: 0.5em; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
  .signature-block {
    border: 1px dashed #94a3b8;
    border-radius: 8px;
    padding: 12px;
    margin: 16px 0;
    min-height: 48px;
  }
  .signature-block--pending { background: #f8fafc; }
  .signature-block--signed { border-style: solid; background: #f0fdf4; }
`;

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

function buildHtmlDocument(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${DOCUMENT_CSS}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

export function isPdfRenderMocked(): boolean {
  return process.env.SIGNATURE_PDF_MOCK === 'true';
}

export function mockPdfRender(bodyHtml: string): RenderHtmlToPdfResult {
  const pdfHeader = Buffer.from('%PDF-1.4 mock Fortify\n');
  const content = Buffer.from(bodyHtml, 'utf8');
  const placements: SignatureFieldPlacement[] = [];
  const regex = /data-signature-key="([^"]+)"/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = regex.exec(bodyHtml)) !== null) {
    placements.push({
      key: match[1],
      page: 0,
      x: 50,
      y: 700 - index * 80,
      width: 200,
      height: 60,
    });
    index += 1;
  }
  return { pdfBuffer: Buffer.concat([pdfHeader, content]), placements };
}

export async function renderFullHtmlToPdf(fullHtml: string): Promise<RenderHtmlToPdfResult> {
  if (isPdfRenderMocked()) {
    return mockPdfRender(fullHtml);
  }

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(fullHtml, { waitUntil: 'load' });

    const pdfBuffer = Buffer.from(
      await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      }),
    );

    return { pdfBuffer, placements: [] };
  } finally {
    await page.close();
  }
}

export async function renderHtmlToPdf(bodyHtml: string): Promise<RenderHtmlToPdfResult> {
  if (isPdfRenderMocked()) {
    return mockPdfRender(bodyHtml);
  }

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(buildHtmlDocument(bodyHtml), { waitUntil: 'networkidle' });

    const rawPlacements = await page.evaluate(() => {
      const A4_HEIGHT = 842;
      const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-signature-key]'));
      return blocks.map((el) => {
        const rect = el.getBoundingClientRect();
        const scrollY = window.scrollY;
        const absoluteTop = rect.top + scrollY;
        const page = Math.floor(absoluteTop / A4_HEIGHT);
        const yOnPage = A4_HEIGHT - (absoluteTop % A4_HEIGHT) - rect.height;
        return {
          key: el.getAttribute('data-signature-key') ?? '',
          page,
          x: rect.left,
          y: Math.max(0, yOnPage),
          width: rect.width,
          height: rect.height,
        };
      });
    });

    const pdfBuffer = Buffer.from(
      await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      }),
    );

    return {
      pdfBuffer,
      placements: rawPlacements.filter((p) => p.key),
    };
  } finally {
    await page.close();
  }
}

export async function closePdfBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
