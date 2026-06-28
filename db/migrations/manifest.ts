import migration001 from './001_initial.sql';
import migration002 from './002_captured_date.sql';

export interface MigrationEntry {
  version: number;
  name: string;
  asset: number;
}

/** Ordered list of schema migrations. Register new files here. */
export const MIGRATIONS: MigrationEntry[] = [
  { version: 1, name: '001_initial', asset: migration001 },
  { version: 2, name: '002_captured_date', asset: migration002 },
];
