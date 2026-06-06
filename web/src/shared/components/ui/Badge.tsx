import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@shared/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-success/20 text-foreground',
        warning: 'border-transparent bg-warning/25 text-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const statusVariant: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
  RASCUNHO: 'muted',
  AGUARDANDO_ASSINATURA: 'warning',
  ASSINADO: 'success',
  ATIVO: 'success',
  VENCENDO: 'warning',
  ENCERRADO: 'muted',
  EXPIRADO: 'destructive',
  PENDENTE: 'warning',
  EMITIDA: 'secondary',
  APROVADA: 'success',
  RECEBIDA: 'success',
  RECEBIDA_PARCIAL: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  ativa: 'success',
  encerrada: 'muted',
};

export function Badge({
  status,
  label,
  variant,
  className,
}: {
  status?: string;
  label?: string;
  variant?: VariantProps<typeof badgeVariants>['variant'];
  className?: string;
}) {
  const resolved = variant ?? (status ? statusVariant[status] ?? 'outline' : 'outline');
  return (
    <span className={cn(badgeVariants({ variant: resolved }), className)}>
      {label ?? status}
    </span>
  );
}

export { badgeVariants };
