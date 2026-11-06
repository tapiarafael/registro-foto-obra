type Named = { name: string } | null | undefined;

export type CaptureScreen = 'predios' | 'pavimentos' | 'unidades' | 'servicos' | 'revisao';

export type CaptureBreadcrumbNav = {
  block?: Named;
  building?: Named;
  floor?: Named;
  unit?: Named;
  service?: Named;
};

export type CaptureBreadcrumbItem = {
  label: string;
  target: CaptureScreen | null;
};

const LEVELS: { key: keyof CaptureBreadcrumbNav; screen: CaptureScreen }[] = [
  { key: 'block', screen: 'predios' },
  { key: 'building', screen: 'pavimentos' },
  { key: 'floor', screen: 'unidades' },
  { key: 'unit', screen: 'servicos' },
  { key: 'service', screen: 'revisao' },
];

export const CAPTURE_LEVEL_ROUTE: Record<CaptureScreen, `/${string}`> = {
  predios: '/registrar/predios',
  pavimentos: '/registrar/pavimentos',
  unidades: '/registrar/unidades',
  servicos: '/registrar/servicos',
  revisao: '/registrar/revisao',
};

export function captureNavPatchForLevel(target: CaptureScreen): {
  building?: null;
  floor?: null;
  unit?: null;
  service?: null;
  photoGroupId?: null;
} {
  switch (target) {
    case 'predios':
      return { building: null, floor: null, unit: null, service: null, photoGroupId: null };
    case 'pavimentos':
      return { floor: null, unit: null, service: null, photoGroupId: null };
    case 'unidades':
      return { unit: null, service: null, photoGroupId: null };
    case 'servicos':
      return { service: null, photoGroupId: null };
    case 'revisao':
      return {};
  }
}

export function captureBreadcrumbItems(
  nav: CaptureBreadcrumbNav,
  current: CaptureScreen,
): CaptureBreadcrumbItem[] {
  const items: CaptureBreadcrumbItem[] = [];
  for (const { key, screen } of LEVELS) {
    const name = nav[key]?.name;
    if (!name) continue;
    items.push({
      label: name,
      target: screen === current ? null : screen,
    });
  }
  return items;
}
