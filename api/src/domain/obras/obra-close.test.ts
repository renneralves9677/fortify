import { describe, it, expect } from 'vitest';
import { VistoriaType } from '@prisma/client';
import { getObraCloseBlockers, getObraCloseWarnings } from './obra-close.js';

const emptyObra = { vistorias: [], custos: [], purchaseOrders: [] };

describe('getObraCloseBlockers', () => {
  it('blocks when INICIAL is missing', () => {
    const blockers = getObraCloseBlockers({
      ...emptyObra,
      vistorias: [{ type: VistoriaType.FINAL }],
    });
    expect(blockers).toContain('Vistoria inicial não registrada');
  });

  it('blocks when FINAL is missing', () => {
    const blockers = getObraCloseBlockers({
      ...emptyObra,
      vistorias: [{ type: VistoriaType.INICIAL }],
    });
    expect(blockers).toContain('Vistoria final não registrada');
  });

  it('allows close when INICIAL and FINAL exist', () => {
    const blockers = getObraCloseBlockers({
      ...emptyObra,
      vistorias: [{ type: VistoriaType.INICIAL }, { type: VistoriaType.FINAL }],
    });
    expect(blockers).toHaveLength(0);
  });
});

describe('getObraCloseWarnings', () => {
  it('warns on empty custos and purchase orders', () => {
    const warnings = getObraCloseWarnings(emptyObra);
    expect(warnings).toContain('Nenhum custo lançado');
    expect(warnings).toContain('Nenhuma ordem de compra (O.C.) emitida');
  });
});
