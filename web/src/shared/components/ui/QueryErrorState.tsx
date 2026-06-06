import { RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@shared/components/ui/Button';
import { Card } from '@shared/components/ui/Card';
import { cn } from '@shared/lib/cn';

type QueryErrorStateProps = {
  title?: string;
  description?: string;
  onRetry: () => void;
  retrying?: boolean;
  compact?: boolean;
  className?: string;
};

export function QueryErrorState({
  title = 'Não foi possível carregar os dados',
  description = 'Verifique sua conexão e tente novamente.',
  onRetry,
  retrying = false,
  compact = false,
  className,
}: QueryErrorStateProps) {
  return (
    <Card
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'border-dashed py-10' : 'py-16',
        className,
      )}
    >
      <span
        className={cn(
          'mb-4 flex items-center justify-center rounded-full bg-danger/10 text-danger',
          compact ? 'h-10 w-10' : 'h-12 w-12',
        )}
      >
        <WifiOff size={compact ? 20 : 24} aria-hidden />
      </span>
      <h3 className={cn('font-semibold text-ink', compact ? 'text-base' : 'text-lg')}>{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-ink-muted">{description}</p>
      )}
      <Button
        type="button"
        variant="secondary"
        className="mt-6"
        loading={retrying}
        onClick={onRetry}
      >
        <RefreshCw size={16} aria-hidden />
        Tentar novamente
      </Button>
    </Card>
  );
}
