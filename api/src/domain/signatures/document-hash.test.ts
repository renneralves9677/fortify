import { describe, it, expect } from 'vitest';
import { hashDocument, hashEventPayload, stripHtml } from './document-hash.js';

describe('document-hash', () => {
  it('hashDocument is deterministic', () => {
    const a = hashDocument('<p>Contrato</p>');
    const b = hashDocument('<p>Contrato</p>');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('hashDocument changes when content changes', () => {
    expect(hashDocument('a')).not.toBe(hashDocument('b'));
  });

  it('stripHtml removes tags', () => {
    expect(stripHtml('<h1>Título</h1><p>Texto</p>')).toContain('Título');
    expect(stripHtml('<h1>Título</h1>')).not.toContain('<h1>');
  });

  it('hashEventPayload chains events', () => {
    const h1 = hashEventPayload({ a: 1 });
    const h2 = hashEventPayload({ a: 2 });
    expect(h1).not.toBe(h2);
  });
});
