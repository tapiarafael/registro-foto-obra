function slugForFileName(s: string): string {
  const slug = s
    .replace(/[^a-zA-Z0-9\u00C0-\u00FF\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return slug || 'relatorio';
}

function toFileDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
}

export function buildReportBaseName(blockName: string, date: string): string {
  return `${slugForFileName(blockName)}_${toFileDateBR(date)}`;
}
