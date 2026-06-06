import { describe, expect, it } from 'vitest';
import { mockPdfRender, isPdfRenderMocked } from './html-to-pdf.js';

describe('html-to-pdf', () => {
  it('mockPdfRender extracts signature placements', () => {
    const html =
      '<div data-signature-key="ASSINATURA_A"></div><div data-signature-key="ASSINATURA_B"></div>';
    const result = mockPdfRender(html);
    expect(result.placements).toHaveLength(2);
    expect(result.placements[0].key).toBe('ASSINATURA_A');
    expect(result.pdfBuffer.length).toBeGreaterThan(0);
  });

  it('isPdfRenderMocked respects env', () => {
    const prev = process.env.SIGNATURE_PDF_MOCK;
    process.env.SIGNATURE_PDF_MOCK = 'true';
    expect(isPdfRenderMocked()).toBe(true);
    process.env.SIGNATURE_PDF_MOCK = prev;
  });
});
