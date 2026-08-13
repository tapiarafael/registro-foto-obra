-- Rebuild photo_group so photos can attach to any hierarchy level,
-- with an optional service. Existing unit+service rows are copied as-is.
-- Apply with PRAGMA foreign_keys=OFF (SQLite cannot change that inside a transaction).

CREATE TABLE photo_group_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_session_id INTEGER NOT NULL REFERENCES inspection_session(id),
  block_id INTEGER REFERENCES block(id),
  building_id INTEGER REFERENCES building(id),
  floor_id INTEGER REFERENCES floor(id),
  unit_id INTEGER REFERENCES unit(id),
  service_id INTEGER REFERENCES service(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (block_id IS NOT NULL) + (building_id IS NOT NULL)
    + (floor_id IS NOT NULL) + (unit_id IS NOT NULL) = 1
  )
);

INSERT INTO photo_group_new (id, inspection_session_id, unit_id, service_id, created_at)
SELECT id, inspection_session_id, unit_id, service_id, created_at FROM photo_group;

DROP TABLE photo_group;
ALTER TABLE photo_group_new RENAME TO photo_group;

CREATE INDEX IF NOT EXISTS idx_photo_group_unit ON photo_group(unit_id);
CREATE INDEX IF NOT EXISTS idx_photo_group_service ON photo_group(service_id);
CREATE INDEX IF NOT EXISTS idx_photo_group_session ON photo_group(inspection_session_id);
CREATE INDEX IF NOT EXISTS idx_photo_group_block ON photo_group(block_id);
CREATE INDEX IF NOT EXISTS idx_photo_group_building ON photo_group(building_id);
CREATE INDEX IF NOT EXISTS idx_photo_group_floor ON photo_group(floor_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pg_session_block_svc
  ON photo_group(inspection_session_id, block_id, service_id)
  WHERE block_id IS NOT NULL AND service_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pg_session_block_nosvc
  ON photo_group(inspection_session_id, block_id)
  WHERE block_id IS NOT NULL AND service_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pg_session_building_svc
  ON photo_group(inspection_session_id, building_id, service_id)
  WHERE building_id IS NOT NULL AND service_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pg_session_building_nosvc
  ON photo_group(inspection_session_id, building_id)
  WHERE building_id IS NOT NULL AND service_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pg_session_floor_svc
  ON photo_group(inspection_session_id, floor_id, service_id)
  WHERE floor_id IS NOT NULL AND service_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pg_session_floor_nosvc
  ON photo_group(inspection_session_id, floor_id)
  WHERE floor_id IS NOT NULL AND service_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pg_session_unit_svc
  ON photo_group(inspection_session_id, unit_id, service_id)
  WHERE unit_id IS NOT NULL AND service_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pg_session_unit_nosvc
  ON photo_group(inspection_session_id, unit_id)
  WHERE unit_id IS NOT NULL AND service_id IS NULL;
