import { User } from 'lucide-react';
import type { ObraRecordCreator } from '@features/obras/types';

type RecordCreatorSectionProps = {
  creator: ObraRecordCreator | undefined;
  label?: string;
};

export function RecordCreatorSection({
  creator,
  label = 'Registrado por',
}: RecordCreatorSectionProps) {
  return (
    <div className="flex items-start gap-3 rounded-control border border-border bg-surface-sunken/50 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <User size={18} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="mt-0.5 font-medium text-ink">{creator?.name ?? 'Usuário desconhecido'}</p>
        {creator?.email && <p className="text-sm text-ink-muted">{creator.email}</p>}
      </div>
    </div>
  );
}
