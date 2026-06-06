import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@shared/components/ui/sonner';
import { ConfirmProvider } from '@shared/components/ConfirmProvider';
import { ColorSchemeProvider } from '@shared/providers/ColorSchemeProvider';
import { extractErrorMessage, notify } from '@shared/lib/notify';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      successMessage?: string;
      skipGlobalError?: boolean;
    };
    queryMeta: {
      skipGlobalError?: boolean;
    };
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.skipGlobalError) return;
      notify.fromError(error, 'Erro ao carregar dados');
    },
  }),
  mutationCache: new MutationCache({
    onSuccess: (_data, _vars, _onMutateResult, mutation) => {
      if (mutation.meta?.successMessage) {
        notify.success(mutation.meta.successMessage);
      }
    },
    onError: (error, _vars, _onMutateResult, mutation) => {
      if (mutation.meta?.skipGlobalError) return;
      notify.fromError(error, 'Erro ao salvar');
    },
  }),
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ColorSchemeProvider>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </ConfirmProvider>
      </QueryClientProvider>
    </ColorSchemeProvider>
  );
}

export { queryClient, extractErrorMessage };
