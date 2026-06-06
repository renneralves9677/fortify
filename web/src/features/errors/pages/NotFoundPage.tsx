import { Link } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from '@shared/components/ui/Button';
import { Card } from '@shared/components/ui/Card';
import { useAuthStore } from '@/stores/auth-store';

type NotFoundPageProps = {
  title?: string;
  description?: string;
  compact?: boolean;
};

export default function NotFoundPage({
  title = 'Página não encontrada',
  description = 'O endereço pode estar incorreto ou o conteúdo foi removido.',
  compact = false,
}: NotFoundPageProps) {
  const token = useAuthStore((s) => s.token);
  const homeTo = token ? '/inicio' : '/';

  const content = (
    <Card
      className={
        compact
          ? 'flex flex-col items-center border-dashed py-12 text-center'
          : 'mx-auto flex max-w-lg flex-col items-center py-16 text-center'
      }
    >
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-ink-muted">
        <FileQuestion size={28} aria-hidden />
      </span>
      <p className="text-sm font-medium uppercase tracking-wide text-ink-muted">Erro 404</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">{description}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to={homeTo}>
          <Button>
            <ArrowLeft size={16} aria-hidden />
            {token ? 'Ir para o início' : 'Voltar ao site'}
          </Button>
        </Link>
        {token && (
          <Link to="/contratos">
            <Button variant="secondary">Ver contratos</Button>
          </Link>
        )}
      </div>
    </Card>
  );

  if (compact) return content;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">{content}</div>
  );
}
