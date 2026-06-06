export interface SignerTimelineItem {
  signOrder: number;
  name: string;
  role: string;
  status: string;
}

const statusText: Record<string, string> = {
  WAITING: 'Aguardando turno',
  PENDING: 'Em assinatura',
  VIEWED: 'Visualizou',
  SIGNED: 'Assinado',
  DECLINED: 'Recusado',
  EXPIRED: 'Expirado',
};

export function SignatureTimeline({ signers }: { signers: SignerTimelineItem[] }) {
  return (
    <ol className="space-y-3">
      {signers.map((s) => (
        <li key={s.signOrder} className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              s.status === 'SIGNED'
                ? 'bg-success/15 text-success'
                : s.status === 'PENDING' || s.status === 'VIEWED'
                  ? 'bg-brand/15 text-brand'
                  : 'bg-surface text-ink-muted'
            }`}
          >
            {s.signOrder}
          </span>
          <div>
            <p className="font-medium text-ink">{s.name}</p>
            <p className="text-xs text-ink-muted">
              {s.role} · {statusText[s.status] ?? s.status}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
