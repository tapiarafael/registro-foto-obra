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

export function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9\u00C0-\u00FF _-]/g, '').trim().replace(/\s+/g, '_');
}

/** First letter of each word — keeps ZIP paths under Windows MAX_PATH. */
export function acronymForPath(s: string): string {
  const trimmed = s.trim();
  if (trimmed.length < 15) return sanitize(trimmed) || 'x';

  const tokens = trimmed.split(/[\s_/\\-]+/).filter(Boolean);
  if (!tokens.length) return 'x';

  const abbr = tokens.map(t =>
    /^\d+$/.test(t) ? t
    : (t.match(/[a-zA-Z\u00C0-\u00FF]/)?.[0].toUpperCase() ?? '')
      + (t.match(/\d+/g)?.join('') ?? '')
  ).join('');
  return abbr || 'x';
}

export function buildReportFolderName(date: string, projectName: string, blockName: string): string {
  return `${date}_${acronymForPath(projectName)}_${acronymForPath(blockName)}`;
}

export function buildReportBaseName(blockName: string, date: string): string {
  return `${slugForFileName(blockName)}_${toFileDateBR(date)}`;
}

export function uniqueZipSegment(base: string, used: Set<string>): string {
  let path = base;
  let n = 2;
  while (used.has(path)) {
    path = `${base}_${n}`;
    n++;
  }
  used.add(path);
  return path;
}

export function zipFolderFromHierarchy(p: {
  building_name?: string | null;
  floor_name?: string | null;
  unit_name?: string | null;
  service_name?: string | null;
}): string {
  const segs: string[] = [];
  if (p.building_name) segs.push(acronymForPath(p.building_name));
  if (p.floor_name) segs.push(acronymForPath(p.floor_name));
  if (p.unit_name) segs.push(acronymForPath(p.unit_name));
  if (p.service_name) segs.push(sanitize(p.service_name) || 'x');
  return segs.join('/');
}

if (__DEV__) {
  console.assert(acronymForPath('Pavimento 01') === 'Pavimento_01');
  console.assert(acronymForPath('Pavimento Superior 01') === 'PS01');
  console.assert(acronymForPath('ECOPARQUE Bairros Integrados') === 'EBI');
  console.assert(acronymForPath('Quadra C - Condomínio Buriticupu') === 'QCCB');
  console.assert(zipFolderFromHierarchy({ building_name: 'Bloco A', service_name: 'Pintura' }) === 'Bloco_A/Pintura');
  console.assert(zipFolderFromHierarchy({ service_name: 'Pintura' }) === 'Pintura');
  console.assert(zipFolderFromHierarchy({}) === '');
}
