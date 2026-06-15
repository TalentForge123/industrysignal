import { createReportAction } from '@/lib/report-actions';

export const dynamic = 'force-dynamic';

// Form action returning ActionResult — Next 14's typed forms expect
// `void | Promise<void>`. We don't render result feedback inline on
// this page (success redirects, failure currently throws to the error
// boundary); the wrapper drops the return value to satisfy the
// signature.
async function handleCreate(formData: FormData): Promise<void> {
  'use server';
  const result = await createReportAction(formData);
  if (!result.ok) {
    throw new Error(result.error ?? 'Vytvoření reportu selhalo.');
  }
}

export default function NewReportPage() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 28px' }}>
      <div className="studio-label">IndustrySignal · Studio</div>
      <h1
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          fontWeight: 700,
          margin: '6px 0 18px',
        }}
      >
        Nový report
      </h1>

      <form action={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="Slug" hint="Kebab-case, použije se v URL (např. 2026-q2).">
          <input className="studio-input" name="slug" required placeholder="2026-q2" />
        </FormField>
        <FormField label="Kvartál" hint='Formát "YYYY-Q[1-4]" (např. 2026-Q2).'>
          <input className="studio-input" name="quarter" required placeholder="2026-Q2" />
        </FormField>
        <FormField label="Titulek CS">
          <input
            className="studio-input"
            name="titleCs"
            required
            placeholder="Český průmysl v Q2 2026"
          />
        </FormField>
        <FormField label="Titulek EN">
          <input
            className="studio-input"
            name="titleEn"
            required
            placeholder="Czech industry in Q2 2026"
          />
        </FormField>

        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button className="studio-btn" data-variant="primary" type="submit">
            Založit draft
          </button>
          <a href="/" className="studio-btn" style={{ textDecoration: 'none' }}>
            Zrušit
          </a>
        </div>
      </form>
    </main>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="studio-label">{label}</span>
      {children}
      {hint ? (
        <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{hint}</span>
      ) : null}
    </label>
  );
}
