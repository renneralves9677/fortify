export type RecordCreator = { id: string; name: string; email: string };

type AuditLogRow = {
  userId: string | null;
  action: string;
  metadata: unknown;
};

export function buildRecordCreatorMaps(logs: AuditLogRow[]) {
  const vistoriaUsers = new Map<string, string>();
  const custoUsers = new Map<string, string>();
  const orderUsers = new Map<string, string>();

  for (const log of logs) {
    if (!log.userId || typeof log.metadata !== 'object' || !log.metadata) continue;
    const meta = log.metadata as Record<string, unknown>;

    if (
      log.action === 'OBRA_VISTORIA_CREATE' &&
      typeof meta.vistoriaId === 'string' &&
      !vistoriaUsers.has(meta.vistoriaId)
    ) {
      vistoriaUsers.set(meta.vistoriaId, log.userId);
    }

    if (log.action === 'OBRA_CUSTO_CREATE' && typeof meta.custoId === 'string' && !custoUsers.has(meta.custoId)) {
      custoUsers.set(meta.custoId, log.userId);
    }

    if (log.action === 'OBRA_OC_CREATE' && typeof meta.orderId === 'string' && !orderUsers.has(meta.orderId)) {
      orderUsers.set(meta.orderId, log.userId);
    }
  }

  return { vistoriaUsers, custoUsers, orderUsers };
}

export function collectCreatorUserIds(maps: ReturnType<typeof buildRecordCreatorMaps>) {
  return [
    ...new Set([
      ...maps.vistoriaUsers.values(),
      ...maps.custoUsers.values(),
      ...maps.orderUsers.values(),
    ]),
  ];
}

export function pickCreator(
  userMap: Map<string, RecordCreator>,
  userId: string | undefined,
): RecordCreator | null {
  if (!userId) return null;
  return userMap.get(userId) ?? null;
}
