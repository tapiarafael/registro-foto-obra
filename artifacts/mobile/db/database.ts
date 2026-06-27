import * as SQLite from 'expo-sqlite';

// ===== TYPES =====
export interface Project {
  id: number;
  name: string;
  address: string | null;
  company: string | null;
  responsible_engineer: string | null;
  created_at: string;
  updated_at: string;
}

export interface Block {
  id: number;
  project_id: number;
  name: string;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  building_count?: number;
  photo_count_today?: number;
}

export interface Building {
  id: number;
  block_id: number;
  name: string;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  floor_count?: number;
  photo_count_today?: number;
}

export interface Floor {
  id: number;
  building_id: number;
  name: string;
  numeric_reference: number | null;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  unit_count?: number;
}

export interface UnitType {
  id: number;
  name: string;
  is_system_type: number;
  sort_order: number;
}

export interface Unit {
  id: number;
  floor_id: number;
  unit_type_id: number | null;
  name: string;
  numeric_reference: number | null;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  unit_type_name?: string;
  photo_count_today?: number;
}

export interface Service {
  id: number;
  project_id: number;
  name: string;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionSession {
  id: number;
  project_id: number;
  started_at: string;
  finished_at: string | null;
  timezone_offset: number;
  created_at: string;
}

export interface PhotoGroup {
  id: number;
  inspection_session_id: number;
  unit_id: number;
  service_id: number;
  created_at: string;
}

export interface Photo {
  id: number;
  photo_group_id: number;
  internal_filename: string;
  thumbnail_filename: string;
  source_type: 'CAMERA' | 'GALLERY';
  captured_at: string;
  imported_at: string | null;
  timezone_offset: number;
  width: number;
  height: number;
  size_bytes: number;
  watermark_version: number;
  created_at: string;
}

export interface PhotoWithHierarchy extends Photo {
  block_name: string;
  building_name: string;
  floor_name: string;
  unit_name: string;
  service_name: string;
  building_sort?: number;
  floor_sort?: number;
  unit_sort?: number;
  service_sort?: number;
}

export interface DateSummary {
  date: string;
  photo_count: number;
  session_count: number;
  total_bytes: number;
  block_count: number;
}

// ===== DB CONNECTION =====
let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('obra.db');
  await _init(_db);
  return _db;
}

async function _init(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

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

    CREATE INDEX IF NOT EXISTS idx_photo_captured ON photo(captured_at);
    CREATE INDEX IF NOT EXISTS idx_photo_group_unit ON photo_group(unit_id);
    CREATE INDEX IF NOT EXISTS idx_photo_group_service ON photo_group(service_id);
    CREATE INDEX IF NOT EXISTS idx_photo_group_session ON photo_group(inspection_session_id);
    CREATE INDEX IF NOT EXISTS idx_building_block ON building(block_id);
    CREATE INDEX IF NOT EXISTS idx_floor_building ON floor(building_id);
    CREATE INDEX IF NOT EXISTS idx_unit_floor ON unit(floor_id);
    CREATE INDEX IF NOT EXISTS idx_session_started ON inspection_session(started_at);
  `);

  const check = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM unit_type');
  if (!check || check.count === 0) {
    await db.execAsync(`
      INSERT INTO unit_type (name, is_system_type, sort_order) VALUES
      ('Apartamento', 1, 1), ('Garagem', 1, 2), ('Área comum', 1, 3),
      ('Hall', 1, 4), ('Escada', 1, 5), ('Elevador', 1, 6),
      ('Salão de festas', 1, 7), ('Academia', 1, 8), ('Área técnica', 1, 9),
      ('Cobertura', 1, 10), ('Depósito', 1, 11), ('Loja', 1, 12),
      ('Outro', 1, 99);
    `);
  }
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `);
}

// ===== PROJECT =====
export async function getProject(): Promise<Project | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Project>('SELECT * FROM project LIMIT 1');
}

export async function createProject(data: { name: string; address?: string; company?: string; responsible_engineer?: string }): Promise<number> {
  const db = await getDatabase();
  const r = await db.runAsync(
    'INSERT INTO project (id, name, address, company, responsible_engineer) VALUES (1, ?, ?, ?, ?)',
    [data.name, data.address ?? null, data.company ?? null, data.responsible_engineer ?? null]
  );
  return r.lastInsertRowId;
}

export async function updateProject(data: Partial<Project>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE project SET name=COALESCE(?,name), address=?, company=?, responsible_engineer=?, updated_at=datetime("now") WHERE id=1',
    [data.name ?? null, data.address ?? null, data.company ?? null, data.responsible_engineer ?? null]
  );
}

// ===== BLOCKS (QUADRAS) =====
export async function getBlocks(projectId: number, includeArchived = false): Promise<Block[]> {
  const db = await getDatabase();
  const where = includeArchived ? '' : 'AND b.archived_at IS NULL';
  return db.getAllAsync<Block>(`
    SELECT b.*,
      (SELECT COUNT(*) FROM building WHERE block_id=b.id AND archived_at IS NULL) as building_count,
      (SELECT COUNT(*) FROM photo p2
       JOIN photo_group pg2 ON pg2.id=p2.photo_group_id
       JOIN unit u2 ON u2.id=pg2.unit_id
       JOIN floor f2 ON f2.id=u2.floor_id
       JOIN building b2 ON b2.id=f2.building_id
       WHERE b2.block_id=b.id AND date(p2.captured_at,'localtime')=date('now','localtime')
      ) as photo_count_today
    FROM block b WHERE b.project_id=? ${where}
    ORDER BY b.sort_order, b.id
  `, [projectId]);
}

export async function createBlock(projectId: number, name: string): Promise<number> {
  const db = await getDatabase();
  const mx = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) as m FROM block WHERE project_id=?', [projectId]);
  const order = (mx?.m ?? 0) + 1;
  const r = await db.runAsync('INSERT INTO block (project_id, name, sort_order) VALUES (?,?,?)', [projectId, name, order]);
  return r.lastInsertRowId;
}

export async function updateBlock(id: number, data: { name?: string; sort_order?: number }): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE block SET name=COALESCE(?,name), sort_order=COALESCE(?,sort_order), updated_at=datetime("now") WHERE id=?',
    [data.name ?? null, data.sort_order ?? null, id]
  );
}

export async function archiveBlock(id: number, restore = false): Promise<void> {
  const db = await getDatabase();
  const val = restore ? null : "datetime('now')";
  await db.runAsync(`UPDATE block SET archived_at=${restore ? 'NULL' : "datetime('now')"}, updated_at=datetime('now') WHERE id=?`, [id]);
}

export async function deleteBlock(id: number): Promise<void> {
  const db = await getDatabase();
  const c = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) as count FROM photo p
    JOIN photo_group pg ON pg.id=p.photo_group_id JOIN unit u ON u.id=pg.unit_id
    JOIN floor f ON f.id=u.floor_id JOIN building b ON b.id=f.building_id WHERE b.block_id=?`, [id]);
  if (c && c.count > 0) throw new Error('Não é possível excluir: existem fotos nesta quadra.');
  await db.runAsync(`DELETE FROM photo_group WHERE unit_id IN (
    SELECT u.id FROM unit u JOIN floor f ON f.id=u.floor_id JOIN building b ON b.id=f.building_id WHERE b.block_id=?)`, [id]);
  await db.runAsync(`DELETE FROM unit WHERE floor_id IN (
    SELECT f.id FROM floor f JOIN building b ON b.id=f.building_id WHERE b.block_id=?)`, [id]);
  await db.runAsync('DELETE FROM floor WHERE building_id IN (SELECT id FROM building WHERE block_id=?)', [id]);
  await db.runAsync('DELETE FROM building WHERE block_id=?', [id]);
  await db.runAsync('DELETE FROM generated_report WHERE block_id=?', [id]);
  await db.runAsync('DELETE FROM block WHERE id=?', [id]);
}

// ===== BUILDINGS (PRÉDIOS) =====
export async function getBuildings(blockId: number, includeArchived = false): Promise<Building[]> {
  const db = await getDatabase();
  const where = includeArchived ? '' : 'AND b.archived_at IS NULL';
  return db.getAllAsync<Building>(`
    SELECT b.*,
      (SELECT COUNT(*) FROM floor WHERE building_id=b.id AND archived_at IS NULL) as floor_count,
      (SELECT COUNT(*) FROM photo p2
       JOIN photo_group pg2 ON pg2.id=p2.photo_group_id
       JOIN unit u2 ON u2.id=pg2.unit_id
       JOIN floor f2 ON f2.id=u2.floor_id
       WHERE f2.building_id=b.id AND date(p2.captured_at,'localtime')=date('now','localtime')
      ) as photo_count_today
    FROM building b WHERE b.block_id=? ${where}
    ORDER BY b.sort_order, b.id
  `, [blockId]);
}

export async function createBuilding(blockId: number, name: string): Promise<number> {
  const db = await getDatabase();
  const mx = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) as m FROM building WHERE block_id=?', [blockId]);
  const order = (mx?.m ?? 0) + 1;
  const r = await db.runAsync('INSERT INTO building (block_id, name, sort_order) VALUES (?,?,?)', [blockId, name, order]);
  return r.lastInsertRowId;
}

export async function updateBuilding(id: number, data: { name?: string }): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE building SET name=COALESCE(?,name), updated_at=datetime("now") WHERE id=?', [data.name ?? null, id]);
}

export async function archiveBuilding(id: number, restore = false): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE building SET archived_at=${restore ? 'NULL' : "datetime('now')"}, updated_at=datetime('now') WHERE id=?`, [id]);
}

export async function deleteBuilding(id: number): Promise<void> {
  const db = await getDatabase();
  const c = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) as count FROM photo p
    JOIN photo_group pg ON pg.id=p.photo_group_id JOIN unit u ON u.id=pg.unit_id
    JOIN floor f ON f.id=u.floor_id WHERE f.building_id=?`, [id]);
  if (c && c.count > 0) throw new Error('Não é possível excluir: existem fotos neste prédio.');
  await db.runAsync(`DELETE FROM photo_group WHERE unit_id IN (
    SELECT u.id FROM unit u JOIN floor f ON f.id=u.floor_id WHERE f.building_id=?)`, [id]);
  await db.runAsync('DELETE FROM unit WHERE floor_id IN (SELECT id FROM floor WHERE building_id=?)', [id]);
  await db.runAsync('DELETE FROM floor WHERE building_id=?', [id]);
  await db.runAsync('DELETE FROM building WHERE id=?', [id]);
}

export async function duplicateBuilding(sourceId: number, targetBlockId: number, newName: string): Promise<number> {
  const db = await getDatabase();
  const mx = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) as m FROM building WHERE block_id=?', [targetBlockId]);
  const order = (mx?.m ?? 0) + 1;
  const r = await db.runAsync('INSERT INTO building (block_id, name, sort_order) VALUES (?,?,?)', [targetBlockId, newName, order]);
  const newBuildingId = r.lastInsertRowId;
  const floors = await db.getAllAsync<Floor>('SELECT * FROM floor WHERE building_id=? AND archived_at IS NULL ORDER BY sort_order', [sourceId]);
  for (const floor of floors) {
    const fr = await db.runAsync('INSERT INTO floor (building_id, name, numeric_reference, sort_order) VALUES (?,?,?,?)',
      [newBuildingId, floor.name, floor.numeric_reference, floor.sort_order]);
    const newFloorId = fr.lastInsertRowId;
    const units = await db.getAllAsync<Unit>('SELECT * FROM unit WHERE floor_id=? AND archived_at IS NULL ORDER BY sort_order', [floor.id]);
    for (const unit of units) {
      await db.runAsync('INSERT INTO unit (floor_id, unit_type_id, name, sort_order) VALUES (?,?,?,?)',
        [newFloorId, unit.unit_type_id, unit.name, unit.sort_order]);
    }
  }
  return newBuildingId;
}

// ===== FLOORS (PAVIMENTOS) =====
export async function getFloors(buildingId: number, includeArchived = false): Promise<Floor[]> {
  const db = await getDatabase();
  const where = includeArchived ? '' : 'AND archived_at IS NULL';
  return db.getAllAsync<Floor>(`
    SELECT f.*,
      (SELECT COUNT(*) FROM unit WHERE floor_id=f.id AND archived_at IS NULL) as unit_count
    FROM floor f WHERE f.building_id=? ${where} ORDER BY f.sort_order, f.id
  `, [buildingId]);
}

export async function createFloor(buildingId: number, name: string, numericReference?: number): Promise<number> {
  const db = await getDatabase();
  const mx = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) as m FROM floor WHERE building_id=?', [buildingId]);
  const order = (mx?.m ?? 0) + 1;
  const r = await db.runAsync('INSERT INTO floor (building_id, name, numeric_reference, sort_order) VALUES (?,?,?,?)',
    [buildingId, name, numericReference ?? null, order]);
  return r.lastInsertRowId;
}

export async function updateFloor(id: number, data: { name?: string; sort_order?: number }): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE floor SET name=COALESCE(?,name), sort_order=COALESCE(?,sort_order), updated_at=datetime("now") WHERE id=?',
    [data.name ?? null, data.sort_order ?? null, id]);
}

export async function archiveFloor(id: number, restore = false): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE floor SET archived_at=${restore ? 'NULL' : "datetime('now')"}, updated_at=datetime('now') WHERE id=?`, [id]);
}

export async function deleteFloor(id: number): Promise<void> {
  const db = await getDatabase();
  const c = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) as count FROM photo p
    JOIN photo_group pg ON pg.id=p.photo_group_id JOIN unit u ON u.id=pg.unit_id WHERE u.floor_id=?`, [id]);
  if (c && c.count > 0) throw new Error('Não é possível excluir: existem fotos neste pavimento.');
  await db.runAsync('DELETE FROM photo_group WHERE unit_id IN (SELECT id FROM unit WHERE floor_id=?)', [id]);
  await db.runAsync('DELETE FROM unit WHERE floor_id=?', [id]);
  await db.runAsync('DELETE FROM floor WHERE id=?', [id]);
}

export async function duplicateFloor(sourceFloorId: number, targetBuildingId: number, newName: string, sortOrder: number): Promise<number> {
  const db = await getDatabase();
  const src = await db.getFirstAsync<Floor>('SELECT * FROM floor WHERE id=?', [sourceFloorId]);
  if (!src) throw new Error('Pavimento não encontrado');
  const r = await db.runAsync('INSERT INTO floor (building_id, name, numeric_reference, sort_order) VALUES (?,?,?,?)',
    [targetBuildingId, newName, null, sortOrder]);
  const newFloorId = r.lastInsertRowId;
  const units = await db.getAllAsync<Unit>('SELECT * FROM unit WHERE floor_id=? AND archived_at IS NULL ORDER BY sort_order', [sourceFloorId]);
  for (const unit of units) {
    await db.runAsync('INSERT INTO unit (floor_id, unit_type_id, name, sort_order) VALUES (?,?,?,?)',
      [newFloorId, unit.unit_type_id, unit.name, unit.sort_order]);
  }
  return newFloorId;
}

// ===== UNIT TYPES =====
export async function getUnitTypes(): Promise<UnitType[]> {
  const db = await getDatabase();
  return db.getAllAsync<UnitType>('SELECT * FROM unit_type ORDER BY sort_order, name');
}

// ===== UNITS =====
export async function getUnits(floorId: number, includeArchived = false): Promise<Unit[]> {
  const db = await getDatabase();
  const where = includeArchived ? '' : 'AND u.archived_at IS NULL';
  return db.getAllAsync<Unit>(`
    SELECT u.*, ut.name as unit_type_name,
      (SELECT COUNT(*) FROM photo p2
       JOIN photo_group pg2 ON pg2.id=p2.photo_group_id
       WHERE pg2.unit_id=u.id AND date(p2.captured_at,'localtime')=date('now','localtime')
      ) as photo_count_today
    FROM unit u LEFT JOIN unit_type ut ON ut.id=u.unit_type_id
    WHERE u.floor_id=? ${where} ORDER BY u.sort_order, u.id
  `, [floorId]);
}

export async function createUnit(floorId: number, name: string, unitTypeId?: number): Promise<number> {
  const db = await getDatabase();
  const mx = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) as m FROM unit WHERE floor_id=?', [floorId]);
  const order = (mx?.m ?? 0) + 1;
  const r = await db.runAsync('INSERT INTO unit (floor_id, unit_type_id, name, sort_order) VALUES (?,?,?,?)',
    [floorId, unitTypeId ?? null, name, order]);
  return r.lastInsertRowId;
}

export async function updateUnit(id: number, data: { name?: string; unit_type_id?: number }): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE unit SET name=COALESCE(?,name), unit_type_id=COALESCE(?,unit_type_id), updated_at=datetime("now") WHERE id=?',
    [data.name ?? null, data.unit_type_id ?? null, id]);
}

export async function archiveUnit(id: number, restore = false): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE unit SET archived_at=${restore ? 'NULL' : "datetime('now')"}, updated_at=datetime('now') WHERE id=?`, [id]);
}

export async function deleteUnit(id: number): Promise<void> {
  const db = await getDatabase();
  const c = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) as count FROM photo p JOIN photo_group pg ON pg.id=p.photo_group_id WHERE pg.unit_id=?`, [id]);
  if (c && c.count > 0) throw new Error('Não é possível excluir: existem fotos nesta unidade.');
  await db.runAsync('DELETE FROM photo_group WHERE unit_id=?', [id]);
  await db.runAsync('DELETE FROM unit WHERE id=?', [id]);
}

// ===== SERVICES =====
export async function getServices(projectId: number, includeArchived = false): Promise<Service[]> {
  const db = await getDatabase();
  const where = includeArchived ? '' : 'AND archived_at IS NULL';
  return db.getAllAsync<Service>(`SELECT * FROM service WHERE project_id=? ${where} ORDER BY sort_order, id`, [projectId]);
}

export async function createService(projectId: number, name: string): Promise<number> {
  const db = await getDatabase();
  const mx = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) as m FROM service WHERE project_id=?', [projectId]);
  const order = (mx?.m ?? 0) + 1;
  const r = await db.runAsync('INSERT INTO service (project_id, name, sort_order) VALUES (?,?,?)', [projectId, name, order]);
  return r.lastInsertRowId;
}

export async function updateService(id: number, data: { name?: string }): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE service SET name=COALESCE(?,name), updated_at=datetime("now") WHERE id=?', [data.name ?? null, id]);
}

export async function archiveService(id: number, restore = false): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE service SET archived_at=${restore ? 'NULL' : "datetime('now')"}, updated_at=datetime('now') WHERE id=?`, [id]);
}

export async function deleteService(id: number): Promise<void> {
  const db = await getDatabase();
  const c = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM photo_group WHERE service_id=?', [id]);
  if (c && c.count > 0) throw new Error('Não é possível excluir: este serviço está em uso.');
  await db.runAsync('DELETE FROM service WHERE id=?', [id]);
}

// ===== INSPECTION SESSIONS =====
export async function startSession(projectId: number): Promise<number> {
  const db = await getDatabase();
  const tzOffset = -new Date().getTimezoneOffset();
  const r = await db.runAsync(
    'INSERT INTO inspection_session (project_id, started_at, timezone_offset) VALUES (?,datetime("now"),?)',
    [projectId, tzOffset]
  );
  return r.lastInsertRowId;
}

export async function getActiveSession(projectId: number): Promise<InspectionSession | null> {
  const db = await getDatabase();
  return db.getFirstAsync<InspectionSession>(
    `SELECT * FROM inspection_session
     WHERE project_id=? AND finished_at IS NULL
     AND date(started_at,'localtime')=date('now','localtime')
     ORDER BY started_at DESC LIMIT 1`,
    [projectId]
  );
}

export async function getSessionById(id: number): Promise<InspectionSession | null> {
  const db = await getDatabase();
  return db.getFirstAsync<InspectionSession>('SELECT * FROM inspection_session WHERE id=?', [id]);
}

export async function finishSession(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE inspection_session SET finished_at=datetime('now') WHERE id=?`, [id]);
}

// ===== PHOTO GROUPS =====
export async function getOrCreatePhotoGroup(sessionId: number, unitId: number, serviceId: number): Promise<number> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<PhotoGroup>(
    'SELECT * FROM photo_group WHERE inspection_session_id=? AND unit_id=? AND service_id=?',
    [sessionId, unitId, serviceId]
  );
  if (existing) return existing.id;
  const r = await db.runAsync(
    'INSERT INTO photo_group (inspection_session_id, unit_id, service_id) VALUES (?,?,?)',
    [sessionId, unitId, serviceId]
  );
  return r.lastInsertRowId;
}

export async function getPhotoGroup(id: number): Promise<PhotoGroup | null> {
  const db = await getDatabase();
  return db.getFirstAsync<PhotoGroup>('SELECT * FROM photo_group WHERE id=?', [id]);
}

export async function getPhotosInGroup(groupId: number): Promise<Photo[]> {
  const db = await getDatabase();
  return db.getAllAsync<Photo>('SELECT * FROM photo WHERE photo_group_id=? ORDER BY captured_at', [groupId]);
}

// ===== PHOTOS =====
export async function addPhoto(data: {
  photoGroupId: number;
  internalFilename: string;
  thumbnailFilename: string;
  sourceType: 'CAMERA' | 'GALLERY';
  capturedAt: string;
  importedAt?: string;
  width: number;
  height: number;
  sizeBytes: number;
}): Promise<number> {
  const db = await getDatabase();
  const tzOffset = -new Date().getTimezoneOffset();
  const r = await db.runAsync(
    `INSERT INTO photo (photo_group_id,internal_filename,thumbnail_filename,source_type,captured_at,imported_at,timezone_offset,width,height,size_bytes)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [data.photoGroupId, data.internalFilename, data.thumbnailFilename, data.sourceType,
     data.capturedAt, data.importedAt ?? null, tzOffset, data.width, data.height, data.sizeBytes]
  );
  return r.lastInsertRowId;
}

export async function deletePhoto(id: number): Promise<Photo | null> {
  const db = await getDatabase();
  const photo = await db.getFirstAsync<Photo>('SELECT * FROM photo WHERE id=?', [id]);
  if (!photo) return null;
  await db.runAsync('DELETE FROM photo WHERE id=?', [id]);
  return photo;
}

// ===== HISTORY QUERIES =====
export async function getDateSummaries(): Promise<DateSummary[]> {
  const db = await getDatabase();
  return db.getAllAsync<DateSummary>(`
    SELECT date(p.captured_at,'localtime') as date,
      COUNT(p.id) as photo_count,
      COUNT(DISTINCT pg.inspection_session_id) as session_count,
      SUM(p.size_bytes) as total_bytes,
      COUNT(DISTINCT b.id) as block_count
    FROM photo p
    JOIN photo_group pg ON pg.id=p.photo_group_id
    JOIN unit u ON u.id=pg.unit_id
    JOIN floor f ON f.id=u.floor_id
    JOIN building bl ON bl.id=f.building_id
    JOIN block b ON b.id=bl.block_id
    GROUP BY date ORDER BY date DESC
  `);
}

export async function getBlocksForDate(date: string): Promise<(Block & { photo_count: number })[]> {
  const db = await getDatabase();
  return db.getAllAsync<Block & { photo_count: number }>(`
    SELECT DISTINCT b.*, COUNT(p.id) as photo_count
    FROM block b
    JOIN building bl ON bl.block_id=b.id
    JOIN floor f ON f.building_id=bl.id
    JOIN unit u ON u.floor_id=f.id
    JOIN photo_group pg ON pg.unit_id=u.id
    JOIN photo p ON p.photo_group_id=pg.id
    WHERE date(p.captured_at,'localtime')=?
    GROUP BY b.id ORDER BY b.sort_order
  `, [date]);
}

export async function getBuildingsForDate(blockId: number, date: string): Promise<(Building & { photo_count: number })[]> {
  const db = await getDatabase();
  return db.getAllAsync<Building & { photo_count: number }>(`
    SELECT DISTINCT bl.*, COUNT(p.id) as photo_count
    FROM building bl
    JOIN floor f ON f.building_id=bl.id
    JOIN unit u ON u.floor_id=f.id
    JOIN photo_group pg ON pg.unit_id=u.id
    JOIN photo p ON p.photo_group_id=pg.id
    WHERE bl.block_id=? AND date(p.captured_at,'localtime')=?
    GROUP BY bl.id ORDER BY bl.sort_order
  `, [blockId, date]);
}

export async function getFloorsForDate(buildingId: number, date: string): Promise<(Floor & { photo_count: number })[]> {
  const db = await getDatabase();
  return db.getAllAsync<Floor & { photo_count: number }>(`
    SELECT DISTINCT f.*, COUNT(p.id) as photo_count
    FROM floor f
    JOIN unit u ON u.floor_id=f.id
    JOIN photo_group pg ON pg.unit_id=u.id
    JOIN photo p ON p.photo_group_id=pg.id
    WHERE f.building_id=? AND date(p.captured_at,'localtime')=?
    GROUP BY f.id ORDER BY f.sort_order
  `, [buildingId, date]);
}

export async function getUnitsForDate(floorId: number, date: string): Promise<(Unit & { photo_count: number })[]> {
  const db = await getDatabase();
  return db.getAllAsync<Unit & { photo_count: number }>(`
    SELECT DISTINCT u.*, COUNT(p.id) as photo_count, ut.name as unit_type_name
    FROM unit u
    LEFT JOIN unit_type ut ON ut.id=u.unit_type_id
    JOIN photo_group pg ON pg.unit_id=u.id
    JOIN photo p ON p.photo_group_id=pg.id
    WHERE u.floor_id=? AND date(p.captured_at,'localtime')=?
    GROUP BY u.id ORDER BY u.sort_order
  `, [floorId, date]);
}

export async function getServicesForDateUnit(unitId: number, date: string): Promise<(Service & { photo_count: number })[]> {
  const db = await getDatabase();
  return db.getAllAsync<Service & { photo_count: number }>(`
    SELECT DISTINCT s.*, COUNT(p.id) as photo_count
    FROM service s
    JOIN photo_group pg ON pg.service_id=s.id
    JOIN photo p ON p.photo_group_id=pg.id
    WHERE pg.unit_id=? AND date(p.captured_at,'localtime')=?
    GROUP BY s.id ORDER BY s.sort_order
  `, [unitId, date]);
}

export async function getPhotosForDateUnitService(unitId: number, serviceId: number, date: string): Promise<PhotoWithHierarchy[]> {
  const db = await getDatabase();
  return db.getAllAsync<PhotoWithHierarchy>(`
    SELECT p.*, b.name as block_name, bl.name as building_name, f.name as floor_name, u.name as unit_name, s.name as service_name
    FROM photo p
    JOIN photo_group pg ON pg.id=p.photo_group_id
    JOIN unit u ON u.id=pg.unit_id
    JOIN service s ON s.id=pg.service_id
    JOIN floor f ON f.id=u.floor_id
    JOIN building bl ON bl.id=f.building_id
    JOIN block b ON b.id=bl.block_id
    WHERE pg.unit_id=? AND pg.service_id=? AND date(p.captured_at,'localtime')=?
    ORDER BY p.captured_at
  `, [unitId, serviceId, date]);
}

// ===== REPORT QUERIES =====
export async function getPhotosForReport(blockId: number, date: string): Promise<PhotoWithHierarchy[]> {
  const db = await getDatabase();
  return db.getAllAsync<PhotoWithHierarchy>(`
    SELECT p.*, b.name as block_name, bl.name as building_name, f.name as floor_name,
      u.name as unit_name, s.name as service_name,
      bl.sort_order as building_sort, f.sort_order as floor_sort, u.sort_order as unit_sort, s.sort_order as service_sort
    FROM photo p
    JOIN photo_group pg ON pg.id=p.photo_group_id
    JOIN unit u ON u.id=pg.unit_id
    JOIN service s ON s.id=pg.service_id
    JOIN floor f ON f.id=u.floor_id
    JOIN building bl ON bl.id=f.building_id
    JOIN block b ON b.id=bl.block_id
    WHERE b.id=? AND date(p.captured_at,'localtime')=?
    ORDER BY bl.sort_order, f.sort_order, u.sort_order, s.sort_order, p.captured_at
  `, [blockId, date]);
}

export async function getBlockPhotoCountForDate(date: string): Promise<{ block_id: number; block_name: string; photo_count: number }[]> {
  const db = await getDatabase();
  return db.getAllAsync(`
    SELECT b.id as block_id, b.name as block_name, COUNT(p.id) as photo_count
    FROM block b
    LEFT JOIN building bl ON bl.block_id=b.id
    LEFT JOIN floor f ON f.building_id=bl.id
    LEFT JOIN unit u ON u.floor_id=f.id
    LEFT JOIN photo_group pg ON pg.unit_id=u.id
    LEFT JOIN photo p ON p.photo_group_id=pg.id AND date(p.captured_at,'localtime')=?
    WHERE b.archived_at IS NULL
    GROUP BY b.id ORDER BY b.sort_order
  `, [date]);
}

// ===== STORAGE =====
export async function getStorageStats(): Promise<{
  total_bytes: number; photo_count: number;
  oldest_date: string | null; newest_date: string | null;
}> {
  const db = await getDatabase();
  const r = await db.getFirstAsync<{ total_bytes: number; photo_count: number; oldest_date: string | null; newest_date: string | null }>(
    `SELECT COALESCE(SUM(size_bytes),0) as total_bytes, COUNT(*) as photo_count,
     MIN(date(captured_at,'localtime')) as oldest_date, MAX(date(captured_at,'localtime')) as newest_date FROM photo`
  );
  return r ?? { total_bytes: 0, photo_count: 0, oldest_date: null, newest_date: null };
}

export async function getStorageByDate(): Promise<{ date: string; photo_count: number; total_bytes: number; session_count: number }[]> {
  const db = await getDatabase();
  return db.getAllAsync(`
    SELECT date(p.captured_at,'localtime') as date, COUNT(p.id) as photo_count,
      SUM(p.size_bytes) as total_bytes, COUNT(DISTINCT pg.inspection_session_id) as session_count
    FROM photo p JOIN photo_group pg ON pg.id=p.photo_group_id
    GROUP BY date ORDER BY date DESC
  `);
}

export async function deletePhotosByDate(date: string): Promise<{ filenames: string[] }> {
  const db = await getDatabase();
  const photos = await db.getAllAsync<Photo>(
    `SELECT p.* FROM photo p WHERE date(p.captured_at,'localtime')=?`, [date]
  );
  const filenames = photos.flatMap(p => [p.internal_filename, p.thumbnail_filename]);
  const photoIds = photos.map(p => p.id);
  if (photoIds.length > 0) {
    const placeholders = photoIds.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM photo WHERE id IN (${placeholders})`, photoIds);
    // Clean up empty photo groups and sessions
    await db.execAsync(`
      DELETE FROM photo_group WHERE id NOT IN (SELECT DISTINCT photo_group_id FROM photo);
      DELETE FROM inspection_session WHERE id NOT IN (SELECT DISTINCT inspection_session_id FROM photo_group);
    `);
  }
  return { filenames };
}

// ===== BULK STRUCTURE GENERATION =====
export async function bulkCreateStructure(
  buildingId: number,
  floors: Array<{ name: string; sort_order: number }>,
  unitsPerFloor: Array<{ name: string; sort_order: number; unit_type_id: number | null }>,
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const floor of floors) {
      const fr = await db.runAsync('INSERT INTO floor (building_id, name, sort_order) VALUES (?,?,?)',
        [buildingId, floor.name, floor.sort_order]);
      const floorId = fr.lastInsertRowId;
      for (const unit of unitsPerFloor) {
        await db.runAsync('INSERT INTO unit (floor_id, unit_type_id, name, sort_order) VALUES (?,?,?,?)',
          [floorId, unit.unit_type_id, unit.name, unit.sort_order]);
      }
    }
  });
}

// ===== TODAY'S PHOTO COUNT =====
export async function getTodayPhotoCount(): Promise<number> {
  const db = await getDatabase();
  const r = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM photo WHERE date(captured_at,'localtime')=date('now','localtime')`
  );
  return r?.count ?? 0;
}

// ===== CLONE OPERATIONS =====
export async function cloneUnit(sourceId: number, targetFloorId: number, newName: string): Promise<number> {
  const db = await getDatabase();
  const src = await db.getFirstAsync<Unit>('SELECT * FROM unit WHERE id=?', [sourceId]);
  if (!src) throw new Error('Unidade não encontrada');
  const mx = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) as m FROM unit WHERE floor_id=?', [targetFloorId]);
  const order = (mx?.m ?? 0) + 1;
  const r = await db.runAsync(
    'INSERT INTO unit (floor_id, unit_type_id, name, sort_order) VALUES (?,?,?,?)',
    [targetFloorId, src.unit_type_id, newName, order]
  );
  return r.lastInsertRowId;
}

export async function cloneFloor(sourceId: number, targetBuildingId: number, newName: string): Promise<number> {
  const db = await getDatabase();
  const mx = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) as m FROM floor WHERE building_id=?', [targetBuildingId]);
  const order = (mx?.m ?? 0) + 1;
  return duplicateFloor(sourceId, targetBuildingId, newName, order);
}

export async function cloneBlock(sourceId: number, projectId: number, newName: string): Promise<number> {
  const db = await getDatabase();
  const mx = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) as m FROM block WHERE project_id=?', [projectId]);
  const order = (mx?.m ?? 0) + 1;
  const r = await db.runAsync('INSERT INTO block (project_id, name, sort_order) VALUES (?,?,?)', [projectId, newName, order]);
  const newBlockId = r.lastInsertRowId;
  const buildings = await db.getAllAsync<Building>('SELECT * FROM building WHERE block_id=? AND archived_at IS NULL ORDER BY sort_order', [sourceId]);
  for (const building of buildings) {
    const br = await db.runAsync('INSERT INTO building (block_id, name, sort_order) VALUES (?,?,?)',
      [newBlockId, building.name, building.sort_order]);
    const floors = await db.getAllAsync<Floor>('SELECT * FROM floor WHERE building_id=? AND archived_at IS NULL ORDER BY sort_order', [building.id]);
    for (const floor of floors) {
      const fr = await db.runAsync('INSERT INTO floor (building_id, name, numeric_reference, sort_order) VALUES (?,?,?,?)',
        [br.lastInsertRowId, floor.name, floor.numeric_reference, floor.sort_order]);
      const units = await db.getAllAsync<Unit>('SELECT * FROM unit WHERE floor_id=? AND archived_at IS NULL ORDER BY sort_order', [floor.id]);
      for (const unit of units) {
        await db.runAsync('INSERT INTO unit (floor_id, unit_type_id, name, sort_order) VALUES (?,?,?,?)',
          [fr.lastInsertRowId, unit.unit_type_id, unit.name, unit.sort_order]);
      }
    }
  }
  return newBlockId;
}

export async function getFloorCloneStats(floorId: number): Promise<{ units: number }> {
  const db = await getDatabase();
  const r = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM unit WHERE floor_id=? AND archived_at IS NULL', [floorId]
  );
  return { units: r?.count ?? 0 };
}

export async function getBuildingCloneStats(buildingId: number): Promise<{ floors: number; units: number }> {
  const db = await getDatabase();
  const f = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM floor WHERE building_id=? AND archived_at IS NULL', [buildingId]
  );
  const u = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) as count FROM unit u JOIN floor f ON f.id=u.floor_id
    WHERE f.building_id=? AND u.archived_at IS NULL AND f.archived_at IS NULL`, [buildingId]
  );
  return { floors: f?.count ?? 0, units: u?.count ?? 0 };
}

export async function getBlockCloneStats(blockId: number): Promise<{ buildings: number; floors: number; units: number }> {
  const db = await getDatabase();
  const b = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM building WHERE block_id=? AND archived_at IS NULL', [blockId]
  );
  const f = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) as count FROM floor f JOIN building bl ON bl.id=f.building_id
    WHERE bl.block_id=? AND f.archived_at IS NULL AND bl.archived_at IS NULL`, [blockId]
  );
  const u = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) as count FROM unit u JOIN floor f ON f.id=u.floor_id JOIN building bl ON bl.id=f.building_id
    WHERE bl.block_id=? AND u.archived_at IS NULL AND f.archived_at IS NULL AND bl.archived_at IS NULL`, [blockId]
  );
  return { buildings: b?.count ?? 0, floors: f?.count ?? 0, units: u?.count ?? 0 };
}

// ===== APP SETTINGS =====
export async function getAppSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key=?', [key]);
  return r?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)', [key, value]);
}
