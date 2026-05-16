// Pure-JS PDF generator. Ported byte-for-byte from
// ui_kits/portal/ArchiveView.jsx. Builds a tiny single-page PDF
// (Courier base font, no embedded subsets) using WinAnsi-safe ASCII —
// good enough for archive-row stand-ins until Playwright-rendered
// editorial PDFs land in Sprint 4.

interface PdfPayload {
  title: string;
  quarter: string;
  date: string;
  subtitle: string;
  body: string[];
}

function asciiize(s: string): string {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[“”„"]/g, '"')
    .replace(/[‘’']/g, "'")
    .replace(/[^\x20-\x7E]/g, '');
}

export function buildSimplePdf({ title, quarter, date, body, subtitle }: PdfPayload): Blob {
  const esc = (s: string) =>
    asciiize(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const lines = [
    `INDUSTRYSIGNAL  /  ${esc(subtitle)}`,
    '',
    `${esc(quarter)}    ${esc(date)}`,
    '',
    esc(title),
    '',
    ...body.map(esc),
  ];

  let stream = 'BT\n/F1 12 Tf\n14 TL\n72 760 Td\n';
  lines.forEach((ln, i) => {
    stream += i === 0 ? `(${ln}) Tj\n` : `T*\n(${ln}) Tj\n`;
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
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(enc.encode(pdf).length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefStart = enc.encode(pdf).length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([enc.encode(pdf)], { type: 'application/pdf' });
}

export function slugify(s: string): string {
  return asciiize(s)
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
