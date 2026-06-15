// Minimal renderer for the editorial preview. Matches the shape used by
// the portal's ReportView so an editor can see the published rendering
// in-Studio without a context switch. The portal's component stays the
// production-facing one — this is a reviewer-facing companion.

interface BodyShape {
  lead: string;
  sections: Array<{ id: string; title: string; summary: string; body: string[] }>;
}

export function ReportRenderer({
  lang,
  title,
  body,
}: {
  lang: 'cs' | 'en';
  title: string;
  body: BodyShape;
}) {
  return (
    <article
      lang={lang}
      style={{
        border: '1px solid var(--graphite-800)',
        background: 'var(--graphite-1000)',
        padding: '16px 18px',
      }}
    >
      <div
        className="studio-label"
        style={{ color: 'var(--amber-300)' }}
      >
        {lang.toUpperCase()}
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          margin: '6px 0 10px',
          color: 'var(--fg-primary)',
        }}
      >
        {title}
      </h2>
      {body.lead ? (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontStyle: 'italic',
            color: 'var(--fg-secondary)',
            margin: '0 0 14px',
            fontSize: 13.5,
            lineHeight: 1.5,
          }}
        >
          {body.lead}
        </p>
      ) : null}

      {body.sections.length === 0 ? (
        <p style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
          (žádné sekce — zatím prázdný draft)
        </p>
      ) : (
        body.sections.map((section, i) => (
          <section
            key={section.id || i}
            style={{
              padding: '10px 0',
              borderTop: i === 0 ? 'none' : '1px solid var(--graphite-800)',
            }}
          >
            <div
              className="studio-label"
              style={{ color: 'var(--amber-300)', fontSize: 9 }}
            >
              {String(i + 1).padStart(2, '0')} · {section.id}
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 16,
                margin: '4px 0 6px',
                color: 'var(--fg-primary)',
              }}
            >
              {section.title}
            </h3>
            {section.summary ? (
              <p
                style={{
                  fontSize: 12.5,
                  color: 'var(--fg-secondary)',
                  margin: '0 0 8px',
                  lineHeight: 1.5,
                }}
              >
                {section.summary}
              </p>
            ) : null}
            {section.body.map((para, j) => (
              <p
                key={j}
                style={{
                  fontSize: 12,
                  color: 'var(--fg-tertiary)',
                  margin: '0 0 6px',
                  lineHeight: 1.55,
                }}
              >
                {para}
              </p>
            ))}
          </section>
        ))
      )}
    </article>
  );
}
