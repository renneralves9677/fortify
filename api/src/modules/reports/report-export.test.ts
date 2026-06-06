import { describe, expect, it } from 'vitest';
import { buildCsv } from './report-export.js';

describe('buildCsv', () => {
  it('escapes commas and quotes in cell values', () => {
    const csv = buildCsv(['Título'], [['Contrato "A", especial']]);
    expect(csv).toBe('Título\n"Contrato ""A"", especial"');
  });
});
