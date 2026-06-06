import { describe, it, expect } from 'vitest';
import {
  generateSignatureReceiptPdf,
  receiptFilename,
  signedDocumentFilename,
} from './signature-receipt-pdf.js';

describe('generateSignatureReceiptPdf', () => {
  it('returns a non-empty PDF buffer', async () => {
    const buffer = await generateSignatureReceiptPdf({
      contractTitle: 'Contrato de Prestação de Serviços',
      signerName: 'Maria Silva',
      signerRole: 'CONTRATANTE',
      signerEmail: 'maria@example.com',
      signedAt: new Date('2025-06-05T14:30:00Z'),
      documentHashAtSign: 'abc123hash456',
      flowId: 'flow-uuid-1',
      eventHash: 'event-hash-xyz',
      otpVerified: true,
    });

    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});

describe('receipt filenames', () => {
  it('slugifies contract title for attachment names', () => {
    expect(receiptFilename('Contrato ABC / 2025')).toBe('comprovante-assinatura-contrato-abc-2025.pdf');
    expect(signedDocumentFilename('Contrato ABC / 2025')).toBe('documento-assinado-contrato-abc-2025.pdf');
  });
});
