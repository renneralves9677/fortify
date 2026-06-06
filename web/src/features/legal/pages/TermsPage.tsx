import { LegalDocumentLayout } from '../components/LegalDocumentLayout';
import { termsSections } from '../lib/legal-content';

export default function TermsPage() {
  return (
    <LegalDocumentLayout title="Termos de Uso">
      {termsSections.map((section) => (
        <section key={section.title}>
          <h2 className="font-display text-xl font-semibold">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="mt-3 text-sm leading-relaxed text-ink-muted">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </LegalDocumentLayout>
  );
}
