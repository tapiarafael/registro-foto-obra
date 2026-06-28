import migration001 from './001_initial.sql';

export interface MigrationEntry {
  version: number;
  name: string;
  asset: number;
}

/** Ordered list of schema migrations. Register new files here. */
export const MIGRATIONS: MigrationEntry[] = [
  { version: 1, name: '001_initial', asset: migration001 },
];
