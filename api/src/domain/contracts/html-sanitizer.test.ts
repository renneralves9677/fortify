import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './html-sanitizer.js';

describe('sanitizeHtml', () => {
  it('preserves template variables', () => {
    const html = '<p>Contratante: {{CONTRATANTE_NOME}}</p>';
    expect(sanitizeHtml(html)).toContain('{{CONTRATANTE_NOME}}');
  });

  it('removes script tags', () => {
    const html = '<p>ok</p><script>alert(1)</script>';
    expect(sanitizeHtml(html)).not.toContain('<script');
    expect(sanitizeHtml(html)).toContain('<p>ok</p>');
  });

  it('strips onerror handlers', () => {
    const html = '<img src="x" onerror="alert(1)" alt="x" />';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('onerror');
  });

  it('blocks javascript: urls', () => {
    const html = '<a href="javascript:alert(1)">x</a>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('javascript:');
  });

  it('removes iframe tags', () => {
    const html = '<iframe src="https://evil.com"></iframe><p>safe</p>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('iframe');
    expect(result).toContain('safe');
  });

  it('preserves signature blocks with data-signature-key', () => {
    const html =
      '<div class="signature-block" data-signature-key="ASSINATURA_CONTRATANTE"><p>Pendente</p></div>';
    const result = sanitizeHtml(html);
    expect(result).toContain('data-signature-key="ASSINATURA_CONTRATANTE"');
  });

  it('allows basic inline styles', () => {
    const html = '<p style="color: #333; text-align: center">Texto</p>';
    const result = sanitizeHtml(html);
    expect(result).toContain('text-align');
  });
});
