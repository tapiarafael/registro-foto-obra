import type * as SQLite from 'expo-sqlite';

interface MigrationEntry {
  version: number;
  name: string;
  sql: string;
}

const MIGRATION_001_INITIAL = `
CREATE TABLE IF NOT EXISTS project (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  company TEXT,
  responsible_engineer TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS block (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES project(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS building (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_id INTEGER NOT NULL REFERENCES block(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS floor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_id INTEGER NOT NULL REFERENCES building(id),
  name TEXT NOT NULL,
  numeric_reference INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS unit_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  is_system_type INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS unit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  floor_id INTEGER NOT NULL REFERENCES floor(id),
  unit_type_id INTEGER REFERENCES unit_type(id),
  name TEXT NOT NULL,
  numeric_reference INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES project(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inspection_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES project(id),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  timezone_offset INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photo_group (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_session_id INTEGER NOT NULL REFERENCES inspection_session(id),
  unit_id INTEGER NOT NULL REFERENCES unit(id),
  service_id INTEGER NOT NULL REFERENCES service(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_group_id INTEGER NOT NULL REFERENCES photo_group(id),
  internal_filename TEXT NOT NULL,
  thumbnail_filename TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'CAMERA',
  captured_at TEXT NOT NULL,
  imported_at TEXT,
  timezone_offset INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  watermark_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generated_report (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date TEXT NOT NULL,
  block_id INTEGER NOT NULL REFERENCES block(id),
  photo_count INTEGER NOT NULL DEFAULT 0,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_photo_captured ON photo(captured_at);
CREATE INDEX IF NOT EXISTS idx_photo_group_unit ON photo_group(unit_id);
CREATE INDEX IF NOT EXISTS idx_photo_group_service ON photo_group(service_id);
CREATE INDEX IF NOT EXISTS idx_photo_group_session ON photo_group(inspection_session_id);
CREATE INDEX IF NOT EXISTS idx_building_block ON building(block_id);
CREATE INDEX IF NOT EXISTS idx_floor_building ON floor(building_id);
CREATE INDEX IF NOT EXISTS idx_unit_floor ON unit(floor_id);
CREATE INDEX IF NOT EXISTS idx_session_started ON inspection_session(started_at);
CREATE INDEX IF NOT EXISTS idx_photo_group_id ON photo(photo_group_id);
CREATE INDEX IF NOT EXISTS idx_block_project ON block(project_id);
CREATE INDEX IF NOT EXISTS idx_service_project ON service(project_id);
CREATE INDEX IF NOT EXISTS idx_session_project ON inspection_session(project_id);

INSERT INTO unit_type (name, is_system_type, sort_order)
SELECT name, is_system_type, sort_order FROM (
  SELECT 'Apartamento' AS name, 1 AS is_system_type, 1 AS sort_order
  UNION ALL SELECT 'Garagem', 1, 2
  UNION ALL SELECT 'Área comum', 1, 3
  UNION ALL SELECT 'Hall', 1, 4
  UNION ALL SELECT 'Escada', 1, 5
  UNION ALL SELECT 'Elevador', 1, 6
  UNION ALL SELECT 'Salão de festas', 1, 7
  UNION ALL SELECT 'Academia', 1, 8
  UNION ALL SELECT 'Área técnica', 1, 9
  UNION ALL SELECT 'Cobertura', 1, 10
  UNION ALL SELECT 'Depósito', 1, 11
  UNION ALL SELECT 'Loja', 1, 12
  UNION ALL SELECT 'Outro', 1, 99
) WHERE (SELECT COUNT(*) FROM unit_type) = 0;
`;

const MIGRATION_002_CAPTURED_DATE = `
ALTER TABLE photo ADD COLUMN captured_date TEXT;
UPDATE photo SET captured_date = date(captured_at, 'localtime') WHERE captured_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_photo_captured_date ON photo(captured_date);
`;

const MIGRATION_003_REPORT_CACHE = `
ALTER TABLE generated_report ADD COLUMN pdf_path TEXT;
ALTER TABLE generated_report ADD COLUMN zip_path TEXT;
ALTER TABLE generated_report ADD COLUMN config_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_report_block_date ON generated_report(block_id, report_date);
`;

const MIGRATIONS: MigrationEntry[] = [
  { version: 1, name: '001_initial', sql: MIGRATION_001_INITIAL },
  { version: 2, name: '002_captured_date', sql: MIGRATION_002_CAPTURED_DATE },
  { version: 3, name: '003_report_cache', sql: MIGRATION_003_REPORT_CACHE },
];

async function applyLegacyWatermarkPatch(db: SQLite.SQLiteDatabase): Promise<void> {
  const photoColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(photo)');
  const hasWatermarkVersion = photoColumns.some(col => col.name === 'watermark_version');
  if (!hasWatermarkVersion) {
    await db.execAsync('ALTER TABLE photo ADD COLUMN watermark_version INTEGER NOT NULL DEFAULT 1');
  }
}

async function applyMigration(db: SQLite.SQLiteDatabase, migration: MigrationEntry): Promise<void> {
  try {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      if (migration.version === 1) {
        await applyLegacyWatermarkPatch(db);
      }
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`Migration ${migration.name} (v${migration.version}) failed: ${message}`);
  }

  console.log(`[db] Applied migration ${migration.name} → v${migration.version}`);
}

export async function getSchemaVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const currentVersion = await getSchemaVersion(db);

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;
    await applyMigration(db, migration);
  }
}
