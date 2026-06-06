import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@shared/lib/api';
import { PageHeader } from '@shared/components/ui/PageHeader';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { useIsAdmin } from '@/stores/auth-store';

export default function TemplatesPage() {
  const isAdmin = useIsAdmin();

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await api.get('/templates')).data,
  });

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Biblioteca de modelos com versionamento e preview em tempo real"
        actions={
          isAdmin ? (
            <Link to="/contratos/templates/novo">
              <Button>Novo template</Button>
            </Link>
          ) : undefined
        }
      />

      {isLoading ? (
        <PageSkeleton />
      ) : isError ? (
        <Card>
          <p className="text-danger">Não foi possível carregar os templates. Tente novamente.</p>
        </Card>
      ) : data.length === 0 ? (
        <Card className="mx-auto max-w-lg text-center">
          <h3 className="text-lg font-semibold text-ink">Nenhum template na sua empresa</h3>
          <p className="mt-2 text-sm text-ink-muted">
            Crie a partir de um modelo padrão com preview.
          </p>
          {isAdmin ? (
            <div className="mt-6">
              <Link to="/contratos/templates/novo">
                <Button>Criar do modelo padrão</Button>
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">
              Peça a um administrador para criar os modelos.
            </p>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map(
            (t: {
              id: string;
              name: string;
              type: string;
              description?: string;
              fields: unknown[];
              versionCount?: number;
            }) => (
              <Card key={t.id} className="flex flex-col transition-shadow hover:shadow-md">
                <p className="text-xs font-medium uppercase tracking-wider text-brand">{t.type}</p>
                <h3 className="mt-2 text-base font-semibold text-ink">{t.name}</h3>
                {t.description && <p className="mt-1 text-sm text-ink-muted">{t.description}</p>}
                <p className="mt-2 text-sm text-ink-muted">
                  {t.fields?.length ?? 0} campos · {t.versionCount ?? 0} versões
                </p>
                <div className="mt-4">
                  <Link to={`/contratos/templates/${t.id}`}>
                    <Button size="sm">Visualizar / editar</Button>
                  </Link>
                </div>
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}
