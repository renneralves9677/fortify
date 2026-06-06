import type { Prisma, SignatureEventType } from '@prisma/client';
import { hashEventPayload } from './document-hash.js';

export interface RecordEventInput {
  flowId: string;
  signerId?: string | null;
  eventType: SignatureEventType;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  previousEventHash?: string | null;
}

export function buildEventData(input: RecordEventInput): Prisma.SignatureEventCreateInput {
  const createdAt = new Date().toISOString();
  const eventHash = hashEventPayload({
    flowId: input.flowId,
    signerId: input.signerId ?? null,
    eventType: input.eventType,
    metadata: input.metadata ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    previousEventHash: input.previousEventHash ?? null,
    createdAt,
  });

  return {
    flow: { connect: { id: input.flowId } },
    ...(input.signerId ? { signer: { connect: { id: input.signerId } } } : {}),
    eventType: input.eventType,
    metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    previousEventHash: input.previousEventHash ?? null,
    eventHash,
  };
}
