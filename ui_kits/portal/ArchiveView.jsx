// IndustrySignal — Archive view. OPEN navigates, PDF downloads (byte-accurate).

const archiveStyles = {
  root: { fontFamily: 'var(--font-mono)' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid var(--graphite-800)',
    background: 'var(--graphite-1000)',
  },
  title: { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber-300)', fontWeight: 600 },
  meta: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  action: { color: 'var(--accent-text)', cursor: 'pointer', marginRight: 12, userSelect: 'none' },
  actionMuted: { color: 'var(--fg-tertiary)', cursor: 'pointer', userSelect: 'none' },
  toast: {
    position: 'fixed', bottom: 36, right: 24,
    background: 'var(--graphite-900)', border: '1px solid var(--amber-300)',
    color: 'var(--fg-primary)', fontFamily: 'var(--font-mono)', fontSize: 11,
    padding: '10px 14px', letterSpacing: '0.04em',
    zIndex: 100,
  },
};

// Strip diacritics + non-ASCII so the WinAnsi base font (Courier) renders cleanly.
function asciiize(s) {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-').replace(/[“”„"]/g, '"').replace(/['']/g, "'")
    .replace(/[^\x20-\x7E]/g, '');
}

// Build a tiny, valid 1-page PDF in pure JS using byte-accurate offsets.
function buildSimplePdf({ title, quarter, date, body, subtitle }) {
  const esc = s => asciiize(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const lines = [
    `INDUSTRYSIGNAL  /  ${esc(subtitle)}`,
    ``,
    `${esc(quarter)}    ${esc(date)}`,
    ``,
    esc(title),
    ``,
    ...body.map(esc),
  ];

  let stream = 'BT\n/F1 12 Tf\n14 TL\n72 760 Td\n';
  lines.forEach((ln, i) => {
    if (i === 0) stream += `(${ln}) Tj\n`;
    else stream += `T*\n(${ln}) Tj\n`;
  });
  stream += 'ET';

  const enc = new TextEncoder();
  const streamBytes = enc.encode(stream).length;

  const objs = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>`,
  ];

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(enc.encode(pdf).length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefStart = enc.encode(pdf).length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(off => { pdf += String(off).padStart(10, '0') + ' 00000 n \n'; });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([enc.encode(pdf)], { type: 'application/pdf' });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.target = '_blank'; a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 4000);
  // Fallback: also open in a new tab so the user can save manually if the
  // sandboxed iframe blocks programmatic downloads.
  try { window.open(url, '_blank', 'noopener'); } catch (e) {}
  return url;
}

function slugify(s) {
  return asciiize(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function ArchiveView({ archive }) {
  const [lang] = window.IS_I18N.useLang();
  const [toast, setToast] = React.useState(null);
  const [urls, setUrls] = React.useState({});

  // Pre-build a blob URL per archive row so the link can be a real <a download>
  // — this works even when programmatic .click() is blocked by the iframe sandbox.
  React.useEffect(() => {
    const next = {};
    archive.forEach(r => {
      const blob = buildSimplePdf({
        title: r.title.toUpperCase(),
        quarter: r.q,
        date: r.date,
        subtitle: t('pdf_subtitle'),
        body: t('pdf_body'),
      });
      next[r.q] = URL.createObjectURL(blob);
    });
    setUrls(next);
    return () => Object.values(next).forEach(u => URL.revokeObjectURL(u));
  }, [lang, archive]);

  const flash = (msg) => {
    setToast(msg);
    clearTimeout(flash._t);
    flash._t = setTimeout(() => setToast(null), 2600);
  };

  const handlePdfClick = (r) => {
    const fname = `IndustrySignal_${r.q.replace(' ', '')}_${slugify(r.title)}.pdf`;
    flash(`${t('pdf_done')} · ${fname}`);
  };

  const handleOpen = (r) => {
    flash(`${t('opening')} ${r.q}…`);
    if (window.__navigateView) window.__navigateView('report');
  };

  return (
    <div style={archiveStyles.root}>
      <div style={archiveStyles.header}>
        <span style={archiveStyles.title}>ARCH · {t('arch_title')}</span>
        <span style={archiveStyles.meta}>{t('arch_meta', archive.length)}</span>
      </div>
      <table className="bbg-table">
        <thead>
          <tr>
            <th style={{ width: 90 }}>{t('col_quarter')}</th>
            <th style={{ width: 140 }}>{t('col_published')}</th>
            <th>{t('col_title')}</th>
            <th className="num" style={{ width: 70 }}>{t('col_pages')}</th>
            <th className="num" style={{ width: 70 }}>{t('col_sections')}</th>
            <th className="num" style={{ width: 90 }}>{t('col_companies')}</th>
            <th style={{ width: 90 }}>{t('col_status')}</th>
            <th style={{ width: 130 }}>{t('col_actions')}</th>
          </tr>
        </thead>
        <tbody>
          {archive.map((r, i) => (
            <tr key={r.q}>
              <td><span className="key">{r.q.replace(' ', '')}</span></td>
              <td style={{ color: 'var(--fg-tertiary)' }}>{r.date}</td>
              <td style={{ color: 'var(--fg-primary)', fontFamily: 'var(--font-serif)', fontWeight: 700, letterSpacing: 0 }}>{r.title}</td>
              <td className="num" style={{ color: 'var(--fg-tertiary)' }}>{32 - i * 2}</td>
              <td className="num" style={{ color: 'var(--fg-tertiary)' }}>5</td>
              <td className="num" style={{ color: 'var(--fg-tertiary)' }}>{147 - i * 4}</td>
              <td>
                <span style={{ padding: '0 6px', color: 'var(--signal-up)', border: '1px solid currentColor', fontSize: 10 }}>{t('status_open')}</span>
              </td>
              <td>
                <span style={archiveStyles.action} onClick={() => handleOpen(r)}>{t('open').toUpperCase()}</span>
                <a
                  href={urls[r.q] || '#'}
                  download={`IndustrySignal_${r.q.replace(' ', '')}_${slugify(r.title)}.pdf`}
                  target="_blank"
                  rel="noopener"
                  onClick={() => handlePdfClick(r)}
                  style={{ ...archiveStyles.actionMuted, textDecoration: 'none' }}
                >{t('pdf')} ↓</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {toast && <div style={archiveStyles.toast}>{toast}</div>}
    </div>
  );
}

window.ArchiveView = ArchiveView;
