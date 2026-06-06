import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type LegalDocumentLayoutProps = {
  title: string;
  children: ReactNode;
};

export function LegalDocumentLayout({ title, children }: LegalDocumentLayoutProps) {
  return (
    <div className="min-h-screen bg-surface px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link to="/login" className="text-sm text-brand hover:underline">
          Voltar ao login
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Documento modelo — revisar com assessoria jurídica antes de produção.
        </p>
        <article className="prose prose-sm mt-8 max-w-none space-y-8 text-ink dark:prose-invert">{children}</article>
      </div>
    </div>
  );
}
