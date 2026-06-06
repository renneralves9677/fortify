import { describe, expect, it } from 'vitest';
import { buildRecordCreatorMaps, collectCreatorUserIds } from './record-creators.js';

describe('record-creators', () => {
  it('maps audit logs to entity creators', () => {
    const maps = buildRecordCreatorMaps([
      {
        userId: 'user-1',
        action: 'OBRA_VISTORIA_CREATE',
        metadata: { vistoriaId: 'vis-1' },
      },
      {
        userId: 'user-2',
        action: 'OBRA_CUSTO_CREATE',
        metadata: { custoId: 'custo-1' },
      },
      {
        userId: 'user-3',
        action: 'OBRA_OC_CREATE',
        metadata: { orderId: 'po-1' },
      },
    ]);

    expect(maps.vistoriaUsers.get('vis-1')).toBe('user-1');
    expect(maps.custoUsers.get('custo-1')).toBe('user-2');
    expect(maps.orderUsers.get('po-1')).toBe('user-3');
    expect(collectCreatorUserIds(maps)).toEqual(['user-1', 'user-2', 'user-3']);
  });
});
