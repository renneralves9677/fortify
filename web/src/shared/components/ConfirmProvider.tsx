import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/components/ui/alert-dialog';
import { cn } from '@shared/lib/utils';

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  /** Conteúdo extra com rolagem (ex.: preview antes de confirmar) */
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const finish = (result: boolean) => {
    setOpen(false);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog open={open} onOpenChange={(v) => !v && finish(false)}>
        <AlertDialogContent className={cn(options?.body && 'flex max-h-[min(90vh,640px)] flex-col')}>
          <AlertDialogHeader className="shrink-0">
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && !options?.body && (
              typeof options.description === 'string' ? (
                <AlertDialogDescription>{options.description}</AlertDialogDescription>
              ) : (
                <div className="text-sm text-muted-foreground">{options.description}</div>
              )
            )}
          </AlertDialogHeader>
          {options?.body && (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {options.description && (
                typeof options.description === 'string' ? (
                  <p className="mb-3 text-sm text-muted-foreground">{options.description}</p>
                ) : (
                  <div className="mb-3 text-sm text-muted-foreground">{options.description}</div>
                )
              )}
              {options.body}
            </div>
          )}
          <AlertDialogFooter className="shrink-0">
            <AlertDialogCancel onClick={() => finish(false)}>
              {options?.cancelLabel ?? 'Cancelar'}
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(options?.variant === 'destructive' && 'bg-destructive hover:bg-destructive/90')}
              onClick={() => finish(true)}
            >
              {options?.confirmLabel ?? 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
