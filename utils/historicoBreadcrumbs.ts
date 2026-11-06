export type HistoricoNavLevel = 'blocks' | 'buildings' | 'floors' | 'units' | 'services';
export type HistoricoLevel = 'dates' | HistoricoNavLevel | 'photos';

export type HistoricoPathNames = {
  block?: { name: string };
  building?: { name: string };
  floor?: { name: string };
  unit?: { name: string };
};

export type HistoricoBreadcrumbItem = {
  label: string;
  target: HistoricoNavLevel | null;
};

export function historicoBreadcrumbItems(
  dateLabel: string,
  path: HistoricoPathNames,
  currentLevel: HistoricoLevel,
): HistoricoBreadcrumbItem[] {
  const entries: { label?: string; target: HistoricoNavLevel }[] = [
    { label: dateLabel, target: 'blocks' },
    { label: path.block?.name, target: 'buildings' },
    { label: path.building?.name, target: 'floors' },
    { label: path.floor?.name, target: 'units' },
    { label: path.unit?.name, target: 'services' },
  ];
  const items: HistoricoBreadcrumbItem[] = [];
  for (const entry of entries) {
    if (!entry.label) continue;
    items.push({
      label: entry.label,
      target: entry.target === currentLevel ? null : entry.target,
    });
  }
  return items;
}
