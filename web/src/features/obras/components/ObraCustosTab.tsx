import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { CustoDetailModal, CustoListItem } from '@features/obras/components/CustoDetailModal';
import { ListLoadingOverlay } from '@shared/components/ui/ListLoadingOverlay';
import type { ObraCusto } from '@features/obras/types';

type ObraCustosTabProps = {
  budgetPlanned: number;
  custos: ObraCusto[];
  canEdit: boolean;
  loading?: boolean;
  onLancarCusto: () => void;
  onEmitirOc?: () => void;
};

export function ObraCustosTab({
  budgetPlanned,
  custos,
  canEdit,
  loading = false,
  onLancarCusto,
  onEmitirOc,
}: ObraCustosTabProps) {
  const [selectedCusto, setSelectedCusto] = useState<ObraCusto | null>(null);

  return (
    <div className="space-y-4">
      <Card className="border-dashed bg-surface-sunken/30 py-3 text-sm text-ink-muted">
        <strong className="text-ink">Materiais, serviços e equipamentos</strong> exigem ordem de compra.
        Combustível, pedágio e despesas administrativas podem ser lançados como custo direto com justificativa.
      </Card>

      <ListLoadingOverlay loading={loading}>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-ink-muted" aria-hidden />
            <div>
              <h3 className="font-medium text-ink">Lançamentos</h3>
              <p className="text-sm text-ink-muted">
                {custos.length} registro{custos.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {onEmitirOc && (
                <Button size="sm" variant="secondary" onClick={onEmitirOc}>
                  Emitir O.C.
                </Button>
              )}
              <Button size="sm" onClick={onLancarCusto}>
                Lançar custo
              </Button>
            </div>
          )}
        </div>

        {!custos.length ? (
          <EmptyState
            title="Nenhum custo lançado"
            description="Lance despesas diretas ou receba ordens de compra para registrar gastos."
            action={
              canEdit ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {onEmitirOc && (
                    <Button variant="secondary" onClick={onEmitirOc}>
                      Emitir O.C.
                    </Button>
                  )}
                  <Button onClick={onLancarCusto}>Lançar custo direto</Button>
                </div>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-3">
            {custos.map((custo) => (
              <li key={custo.id}>
                <CustoListItem custo={custo} onOpen={() => setSelectedCusto(custo)} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      </ListLoadingOverlay>

      <CustoDetailModal
        custo={selectedCusto}
        open={!!selectedCusto}
        onClose={() => setSelectedCusto(null)}
        budgetPlanned={budgetPlanned}
      />
    </div>
  );
}
