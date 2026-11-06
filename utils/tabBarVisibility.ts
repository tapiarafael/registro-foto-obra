export function shouldHideAppTabBar(segments: readonly string[]): boolean {
  return segments.includes('camera') || segments[0] === 'setup';
}
