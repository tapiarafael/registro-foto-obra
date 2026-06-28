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
