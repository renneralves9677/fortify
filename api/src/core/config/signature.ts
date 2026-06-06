export function isSignaturePdfFirstEnabled(): boolean {
  return process.env.SIGNATURE_PDF_FIRST !== 'false';
}
