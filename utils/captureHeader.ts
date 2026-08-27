type Named = { name: string } | null | undefined;

export type CaptureHeaderNav = {
  block?: Named;
  building?: Named;
  floor?: Named;
  unit?: Named;
  service?: Named;
};

export function captureHeader(nav: CaptureHeaderNav): { title: string; path: string } {
  const parts = [nav.block?.name, nav.building?.name, nav.floor?.name, nav.unit?.name, nav.service?.name]
    .filter((n): n is string => !!n);
  return { title: parts.at(-1) ?? '', path: parts.slice(0, -1).join(' · ') };
}
