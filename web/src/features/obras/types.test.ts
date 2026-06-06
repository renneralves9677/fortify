import { describe, it, expect } from 'vitest';
import {
  auditActionGroupLabels,
  canEditObra,
  getAuditActionGroup,
  getObraTabs,
} from '@features/obras/types';

describe('obra tabs and readonly helpers', () => {
  it('shows Auditoria tab only for admin', () => {
    expect(getObraTabs(true)).toContain('Auditoria');
    expect(getObraTabs(false)).not.toContain('Auditoria');
    expect(getObraTabs(false)).not.toContain('Arquivos');
  });

  it('places Preview after Auditoria for admin', () => {
    expect(getObraTabs(true)).toEqual([
      'Roteiro',
      'Custos',
      'Vistorias',
      'O.C.',
      'Auditoria',
      'Preview',
    ]);
    expect(getObraTabs(false)).toEqual(['Roteiro', 'Custos', 'Vistorias', 'O.C.', 'Preview']);
  });

  it('blocks edits when obra is encerrada', () => {
    expect(canEditObra(true, 'encerrada')).toBe(false);
    expect(canEditObra(true, 'ativa')).toBe(true);
    expect(canEditObra(false, 'ativa')).toBe(false);
  });
});

describe('audit action groups', () => {
  it('maps actions to groups', () => {
    expect(getAuditActionGroup('OBRA_STEP_UPDATE')).toBe('etapas');
    expect(getAuditActionGroup('OBRA_CUSTO_CREATE')).toBe('custos');
    expect(getAuditActionGroup('OBRA_VISTORIA_CREATE')).toBe('vistorias');
    expect(getAuditActionGroup('OBRA_OC_APPROVE')).toBe('oc');
    expect(getAuditActionGroup('OBRA_CLOSE')).toBe('outros');
  });

  it('exposes labels for every group', () => {
    expect(Object.keys(auditActionGroupLabels)).toHaveLength(5);
    expect(auditActionGroupLabels.custos).toBe('Custos');
  });
});
