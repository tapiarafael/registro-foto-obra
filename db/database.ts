import * as SQLite from 'expo-sqlite';

import { runMigrations } from './migrate';
import { toLocalDateString } from '@/services/photoService';

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
  captured_date: string;
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

export interface GeneratedReport {
  id: number;
  report_date: string;
  block_id: number;
  photo_count: number;
  generated_at: string;
  status: string;
  pdf_path: string | null;
  zip_path: string | null;
  config_hash: string | null;
}

// ===== DB CONNECTION =====
let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (!_initPromise) {
    _initPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('obra.db');
      await _init(db);
      _db = db;
      return db;
    })().catch(e => {
      _initPromise = null;
      throw e;
    });
  }
  return _initPromise;
}

async function _init(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
  await runMigrations(db);
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
export async function getBlocksLite(projectId: number, includeArchived = false): Promise<Block[]> {
  const db = await getDatabase();
  const where = includeArchived ? '' : 'AND b.archived_at IS NULL';
  return db.getAllAsync<Block>(`
    SELECT b.* FROM block b WHERE b.project_id=? ${where}
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

export async function deleteBlock(id: number): Promise<GeneratedReport[]> {
  const db = await getDatabase();
  const c = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) as count FROM photo p
    JOIN photo_group pg ON pg.id=p.photo_group_id JOIN unit u ON u.id=pg.unit_id
    JOIN floor f ON f.id=u.floor_id JOIN building b ON b.id=f.building_id WHERE b.block_id=?`, [id]);
  if (c && c.count > 0) throw new Error('Não é possível excluir: existem fotos nesta quadra.');
  let reports: GeneratedReport[] = [];
  await db.withTransactionAsync(async () => {
    reports = await db.getAllAsync<GeneratedReport>(
      'SELECT * FROM generated_report WHERE block_id=?',
      [id],
    );
    await db.runAsync(`DELETE FROM photo_group WHERE unit_id IN (
      SELECT u.id FROM unit u JOIN floor f ON f.id=u.floor_id JOIN building b ON b.id=f.building_id WHERE b.block_id=?)`, [id]);
    await db.runAsync(`DELETE FROM unit WHERE floor_id IN (
      SELECT f.id FROM floor f JOIN building b ON b.id=f.building_id WHERE b.block_id=?)`, [id]);
    await db.runAsync('DELETE FROM floor WHERE building_id IN (SELECT id FROM building WHERE block_id=?)', [id]);
    await db.runAsync('DELETE FROM building WHERE block_id=?', [id]);
    await db.runAsync('DELETE FROM generated_report WHERE block_id=?', [id]);
    await db.runAsync('DELETE FROM block WHERE id=?', [id]);
  });
  return reports;
}

// ===== BUILDINGS (PRÉDIOS) =====
export async function getBuildingsLite(blockId: number, includeArchived = false): Promise<Building[]> {
  const db = await getDatabase();
  const where = includeArchived ? '' : 'AND b.archived_at IS NULL';
  return db.getAllAsync<Building>(`
    SELECT b.* FROM building b WHERE b.block_id=? ${where}
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
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM photo_group WHERE unit_id IN (
      SELECT u.id FROM unit u JOIN floor f ON f.id=u.floor_id WHERE f.building_id=?)`, [id]);
    await db.runAsync('DELETE FROM unit WHERE floor_id IN (SELECT id FROM floor WHERE building_id=?)', [id]);
    await db.runAsync('DELETE FROM floor WHERE building_id=?', [id]);
    await db.runAsync('DELETE FROM building WHERE id=?', [id]);
  });
}

export type CloneProgressCallback = (current: number, total: number) => void | Promise<void>;

const UNIT_BATCH_SIZE = 100;

function yieldToUI(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

async function emitCloneProgress(
  onProgress: CloneProgressCallback | undefined,
  current: number,
  total: number,
): Promise<void> {
  if (!onProgress) return;
  await onProgress(current, total);
  await yieldToUI();
}

type UnitCloneRow = Pick<Unit, 'unit_type_id' | 'name' | 'sort_order'>;

async function batchInsertUnits(
  db: SQLite.SQLiteDatabase,
  floorId: number,
  units: UnitCloneRow[],
  chunkSize = UNIT_BATCH_SIZE,
): Promise<number> {
  if (units.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < units.length; i += chunkSize) {
    const chunk = units.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '(?,?,?,?)').join(',');
    const params = chunk.flatMap(u => [floorId, u.unit_type_id, u.name, u.sort_order]);
    await db.runAsync(
      `INSERT INTO unit (floor_id, unit_type_id, name, sort_order) VALUES ${placeholders}`,
      params,
    );
    inserted += chunk.length;
  }
  return inserted;
}

function groupByParent<T>(items: T[], getKey: (item: T) => number): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

async function fetchUnitsForFloors(db: SQLite.SQLiteDatabase, floorIds: number[]): Promise<Unit[]> {
  if (floorIds.length === 0) return [];
  const placeholders = floorIds.map(() => '?').join(',');
  return db.getAllAsync<Unit>(
    `SELECT * FROM unit WHERE floor_id IN (${placeholders}) AND archived_at IS NULL ORDER BY sort_order`,
    floorIds,
  );
}

export async function duplicateBuilding(
  sourceId: number,
  targetBlockId: number,
  newName: string,
  onProgress?: CloneProgressCallback,
): Promise<number> {
  const db = await getDatabase();
  const floors = await db.getAllAsync<Floor>(
    'SELECT * FROM floor WHERE building_id=? AND archived_at IS NULL ORDER BY sort_order',
    [sourceId],
  );
  const allUnits = await fetchUnitsForFloors(db, floors.map(f => f.id));
  const unitsByFloor = groupByParent(allUnits, u => u.floor_id);
  const total = 1 + floors.length + allUnits.length;
  const mx = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(sort_order) as m FROM building WHERE block_id=?',
    [targetBlockId],
  );
  const order = (mx?.m ?? 0) + 1;
  try {
    let newBuildingId = 0;
    let progress = 0;
    await db.withTransactionAsync(async () => {
      const r = await db.runAsync(
        'INSERT INTO building (block_id, name, sort_order) VALUES (?,?,?)',
        [targetBlockId, newName, order],
      );
      newBuildingId = r.lastInsertRowId;
      progress = 1;
      await emitCloneProgress(onProgress, progress, total);
      for (const floor of floors) {
        const fr = await db.runAsync(
          'INSERT INTO floor (building_id, name, numeric_reference, sort_order) VALUES (?,?,?,?)',
          [newBuildingId, floor.name, floor.numeric_reference, floor.sort_order],
        );
        progress += 1;
        await emitCloneProgress(onProgress, progress, total);
        progress += await batchInsertUnits(db, fr.lastInsertRowId, unitsByFloor.get(floor.id) ?? []);
        await emitCloneProgress(onProgress, progress, total);
      }
    });
    return newBuildingId;
  } catch {
    throw new Error('Não foi possível duplicar o prédio.');
  }
}

// ===== FLOORS (PAVIMENTOS) =====
export async function getFloorsLite(buildingId: number, includeArchived = false): Promise<Floor[]> {
  const db = await getDatabase();
  const where = includeArchived ? '' : 'AND archived_at IS NULL';
  return db.getAllAsync<Floor>(`
    SELECT f.* FROM floor f WHERE f.building_id=? ${where} ORDER BY f.sort_order, f.id
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
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM photo_group WHERE unit_id IN (SELECT id FROM unit WHERE floor_id=?)', [id]);
    await db.runAsync('DELETE FROM unit WHERE floor_id=?', [id]);
    await db.runAsync('DELETE FROM floor WHERE id=?', [id]);
  });
}

export async function duplicateFloor(
  sourceFloorId: number,
  targetBuildingId: number,
  newName: string,
  sortOrder: number,
  onProgress?: CloneProgressCallback,
): Promise<number> {
  const db = await getDatabase();
  const src = await db.getFirstAsync<Floor>('SELECT * FROM floor WHERE id=?', [sourceFloorId]);
  if (!src) throw new Error('Pavimento não encontrado');
  const units = await db.getAllAsync<Unit>(
    'SELECT * FROM unit WHERE floor_id=? AND archived_at IS NULL ORDER BY sort_order',
    [sourceFloorId],
  );
  const total = 1 + units.length;
  try {
    let newFloorId = 0;
    await db.withTransactionAsync(async () => {
      const r = await db.runAsync(
        'INSERT INTO floor (building_id, name, numeric_reference, sort_order) VALUES (?,?,?,?)',
        [targetBuildingId, newName, null, sortOrder],
      );
      newFloorId = r.lastInsertRowId;
      await emitCloneProgress(onProgress, 1, total);
      const inserted = await batchInsertUnits(db, newFloorId, units);
      await emitCloneProgress(onProgress, 1 + inserted, total);
    });
    return newFloorId;
  } catch {
    throw new Error('Não foi possível duplicar o pavimento.');
  }
}

// ===== UNIT TYPES =====
export async function getUnitTypes(): Promise<UnitType[]> {
  const db = await getDatabase();
  return db.getAllAsync<UnitType>('SELECT * FROM unit_type ORDER BY sort_order, name');
}

// ===== UNITS =====
export async function getUnitsLite(floorId: number, includeArchived = false): Promise<Unit[]> {
  const db = await getDatabase();
  const where = includeArchived ? '' : 'AND u.archived_at IS NULL';
  return db.getAllAsync<Unit>(`
    SELECT u.*, ut.name as unit_type_name
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
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM photo_group WHERE unit_id=?', [id]);
    await db.runAsync('DELETE FROM unit WHERE id=?', [id]);
  });
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
  const capturedDate = toLocalDateString(data.capturedAt);
  const r = await db.runAsync(
    `INSERT INTO photo (photo_group_id,internal_filename,thumbnail_filename,source_type,captured_at,captured_date,imported_at,timezone_offset,width,height,size_bytes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [data.photoGroupId, data.internalFilename, data.thumbnailFilename, data.sourceType,
     data.capturedAt, capturedDate, data.importedAt ?? null, tzOffset, data.width, data.height, data.sizeBytes]
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
interface PhotoCountsByDate {
  date: string;
  photo_count: number;
  session_count: number;
  total_bytes: number;
}

async function getPhotoCountsByDate(): Promise<PhotoCountsByDate[]> {
  const db = await getDatabase();
  return db.getAllAsync<PhotoCountsByDate>(`
    SELECT p.captured_date as date, COUNT(p.id) as photo_count,
      SUM(p.size_bytes) as total_bytes, COUNT(DISTINCT pg.inspection_session_id) as session_count
    FROM photo p JOIN photo_group pg ON pg.id=p.photo_group_id
    WHERE p.captured_date IS NOT NULL
    GROUP BY p.captured_date ORDER BY date DESC
  `);
}

export async function getDateSummaries(): Promise<DateSummary[]> {
  const db = await getDatabase();
  const [counts, blockCounts] = await Promise.all([
    getPhotoCountsByDate(),
    db.getAllAsync<{ date: string; block_count: number }>(`
      SELECT p.captured_date as date, COUNT(DISTINCT b.id) as block_count
      FROM photo p
      JOIN photo_group pg ON pg.id=p.photo_group_id
      JOIN unit u ON u.id=pg.unit_id
      JOIN floor f ON f.id=u.floor_id
      JOIN building bl ON bl.id=f.building_id
      JOIN block b ON b.id=bl.block_id
      WHERE p.captured_date IS NOT NULL
      GROUP BY p.captured_date
    `),
  ]);
  const blockMap = new Map(blockCounts.map(r => [r.date, r.block_count]));
  return counts
    .filter(r => r.date != null)
    .map(r => ({ ...r, block_count: blockMap.get(r.date) ?? 0 }));
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
    WHERE p.captured_date=?
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
    WHERE bl.block_id=? AND p.captured_date=?
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
    WHERE f.building_id=? AND p.captured_date=?
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
    WHERE u.floor_id=? AND p.captured_date=?
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
    WHERE pg.unit_id=? AND p.captured_date=?
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
    WHERE pg.unit_id=? AND pg.service_id=? AND p.captured_date=?
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
    WHERE b.id=? AND p.captured_date=?
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
    LEFT JOIN photo p ON p.photo_group_id=pg.id AND p.captured_date=?
    WHERE b.archived_at IS NULL
    GROUP BY b.id ORDER BY b.sort_order
  `, [date]);
}

export async function getPhotoCountForBlockDate(blockId: number, date: string): Promise<number> {
  const db = await getDatabase();
  const r = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(p.id) as count
    FROM photo p
    JOIN photo_group pg ON pg.id=p.photo_group_id
    JOIN unit u ON u.id=pg.unit_id
    JOIN floor f ON f.id=u.floor_id
    JOIN building bl ON bl.id=f.building_id
    WHERE bl.block_id=? AND p.captured_date=?
  `, [blockId, date]);
  return r?.count ?? 0;
}

export async function getGeneratedReport(blockId: number, date: string): Promise<GeneratedReport | null> {
  const db = await getDatabase();
  return db.getFirstAsync<GeneratedReport>(
    'SELECT * FROM generated_report WHERE block_id=? AND report_date=?',
    [blockId, date],
  );
}

export async function getGeneratedReportsForDate(date: string): Promise<GeneratedReport[]> {
  const db = await getDatabase();
  return db.getAllAsync<GeneratedReport>(
    'SELECT * FROM generated_report WHERE report_date=?',
    [date],
  );
}

export async function upsertGeneratedReport(data: {
  blockId: number;
  date: string;
  photoCount: number;
  configHash: string;
  pdfPath?: string | null;
  zipPath?: string | null;
}): Promise<void> {
  const db = await getDatabase();
  const existing = await getGeneratedReport(data.blockId, data.date);
  const pdfPath = data.pdfPath !== undefined ? data.pdfPath : existing?.pdf_path ?? null;
  const zipPath = data.zipPath !== undefined ? data.zipPath : existing?.zip_path ?? null;
  await db.runAsync(`
    INSERT INTO generated_report (report_date, block_id, photo_count, config_hash, pdf_path, zip_path, generated_at, status)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 'ready')
    ON CONFLICT(block_id, report_date) DO UPDATE SET
      photo_count=excluded.photo_count,
      config_hash=excluded.config_hash,
      pdf_path=excluded.pdf_path,
      zip_path=excluded.zip_path,
      generated_at=datetime('now'),
      status='ready'
  `, [data.date, data.blockId, data.photoCount, data.configHash, pdfPath, zipPath]);
}

export async function deleteGeneratedReportsForDate(date: string): Promise<GeneratedReport[]> {
  const db = await getDatabase();
  const reports = await getGeneratedReportsForDate(date);
  if (reports.length > 0) {
    await db.runAsync('DELETE FROM generated_report WHERE report_date=?', [date]);
  }
  return reports;
}

export async function getReportConfigHash(): Promise<string> {
  const [color, pagination, logo, grouping, quality, wm] = await Promise.all([
    getAppSetting('report_primaryColor'),
    getAppSetting('report_paginationMode'),
    getAppSetting('report_logoPath'),
    getAppSetting('report_groupingFields'),
    getAppSetting('report_imageQuality'),
    getWatermarkConfig(),
  ]);
  return JSON.stringify({ color, pagination, logo, grouping, quality, wm });
}

// ===== STORAGE =====
export async function getStorageStats(): Promise<{
  total_bytes: number; photo_count: number;
  oldest_date: string | null; newest_date: string | null;
}> {
  const db = await getDatabase();
  const r = await db.getFirstAsync<{ total_bytes: number; photo_count: number; oldest_date: string | null; newest_date: string | null }>(
    `SELECT COALESCE(SUM(size_bytes),0) as total_bytes, COUNT(*) as photo_count,
     MIN(captured_date) as oldest_date, MAX(captured_date) as newest_date FROM photo`
  );
  return r ?? { total_bytes: 0, photo_count: 0, oldest_date: null, newest_date: null };
}

export async function getStorageByDate(): Promise<{ date: string; photo_count: number; total_bytes: number; session_count: number }[]> {
  return getPhotoCountsByDate();
}

export async function deletePhotosByDate(date: string): Promise<{ filenames: string[]; reports: GeneratedReport[] }> {
  const db = await getDatabase();
  const photos = await db.getAllAsync<Photo>(
    `SELECT p.* FROM photo p WHERE p.captured_date=?`, [date]
  );
  const filenames = photos.flatMap(p => [p.internal_filename, p.thumbnail_filename]);
  const photoIds = photos.map(p => p.id);
  const reports = await deleteGeneratedReportsForDate(date);
  if (photoIds.length > 0) {
    const placeholders = photoIds.map(() => '?').join(',');
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM photo WHERE id IN (${placeholders})`, photoIds);
      await db.execAsync(`
        DELETE FROM photo_group WHERE id NOT IN (SELECT DISTINCT photo_group_id FROM photo);
        DELETE FROM inspection_session WHERE id NOT IN (SELECT DISTINCT inspection_session_id FROM photo_group);
      `);
    });
  }
  return { filenames, reports };
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
    `SELECT COUNT(*) as count FROM photo WHERE captured_date=date('now','localtime')`
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

export async function cloneFloor(
  sourceId: number,
  targetBuildingId: number,
  newName: string,
  onProgress?: CloneProgressCallback,
): Promise<number> {
  const db = await getDatabase();
  const mx = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(sort_order) as m FROM floor WHERE building_id=?',
    [targetBuildingId],
  );
  const order = (mx?.m ?? 0) + 1;
  return duplicateFloor(sourceId, targetBuildingId, newName, order, onProgress);
}

export async function cloneBlock(
  sourceId: number,
  projectId: number,
  newName: string,
  onProgress?: CloneProgressCallback,
): Promise<number> {
  const db = await getDatabase();
  const buildings = await db.getAllAsync<Building>(
    'SELECT * FROM building WHERE block_id=? AND archived_at IS NULL ORDER BY sort_order',
    [sourceId],
  );
  const buildingIds = buildings.map(b => b.id);
  let floors: Floor[] = [];
  if (buildingIds.length > 0) {
    const placeholders = buildingIds.map(() => '?').join(',');
    floors = await db.getAllAsync<Floor>(
      `SELECT * FROM floor WHERE building_id IN (${placeholders}) AND archived_at IS NULL ORDER BY sort_order`,
      buildingIds,
    );
  }
  const allUnits = await fetchUnitsForFloors(db, floors.map(f => f.id));
  const floorsByBuilding = groupByParent(floors, f => f.building_id);
  const unitsByFloor = groupByParent(allUnits, u => u.floor_id);
  const total = 1 + buildings.length + floors.length + allUnits.length;
  const mx = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(sort_order) as m FROM block WHERE project_id=?',
    [projectId],
  );
  const order = (mx?.m ?? 0) + 1;
  try {
    let newBlockId = 0;
    let progress = 0;
    await db.withTransactionAsync(async () => {
      const r = await db.runAsync(
        'INSERT INTO block (project_id, name, sort_order) VALUES (?,?,?)',
        [projectId, newName, order],
      );
      newBlockId = r.lastInsertRowId;
      progress = 1;
      await emitCloneProgress(onProgress, progress, total);
      for (const building of buildings) {
        const br = await db.runAsync(
          'INSERT INTO building (block_id, name, sort_order) VALUES (?,?,?)',
          [newBlockId, building.name, building.sort_order],
        );
        progress += 1;
        await emitCloneProgress(onProgress, progress, total);
        for (const floor of floorsByBuilding.get(building.id) ?? []) {
          const fr = await db.runAsync(
            'INSERT INTO floor (building_id, name, numeric_reference, sort_order) VALUES (?,?,?,?)',
            [br.lastInsertRowId, floor.name, floor.numeric_reference, floor.sort_order],
          );
          progress += 1;
          await emitCloneProgress(onProgress, progress, total);
          progress += await batchInsertUnits(db, fr.lastInsertRowId, unitsByFloor.get(floor.id) ?? []);
          await emitCloneProgress(onProgress, progress, total);
        }
      }
    });
    return newBlockId;
  } catch {
    throw new Error('Não foi possível duplicar a quadra.');
  }
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

// ===== WATERMARK CONFIG =====
export type WatermarkFieldKey = 'datetime' | 'quadra' | 'predio' | 'pavimento' | 'unidade' | 'servico';

export interface WatermarkFieldItem {
  field: WatermarkFieldKey;
  enabled: boolean;
}

export interface WatermarkConfig {
  enabled: boolean;
  fields: WatermarkFieldItem[];
}

export const DEFAULT_WATERMARK_FIELDS: WatermarkFieldItem[] = [
  { field: 'datetime', enabled: true },
  { field: 'quadra', enabled: true },
  { field: 'predio', enabled: true },
  { field: 'pavimento', enabled: true },
  { field: 'unidade', enabled: true },
  { field: 'servico', enabled: true },
];

export async function getWatermarkConfig(): Promise<WatermarkConfig> {
  const [enabledStr, fieldsStr] = await Promise.all([
    getAppSetting('watermark_enabled'),
    getAppSetting('watermark_fields'),
  ]);
  const enabled = enabledStr === null ? true : enabledStr === '1';
  let fields: WatermarkFieldItem[] = DEFAULT_WATERMARK_FIELDS;
  if (fieldsStr) {
    try {
      const parsed: WatermarkFieldItem[] = JSON.parse(fieldsStr);
      if (Array.isArray(parsed) && parsed.length === 6) fields = parsed;
    } catch {}
  }
  return { enabled, fields };
}

export async function saveWatermarkConfig(config: WatermarkConfig): Promise<void> {
  await Promise.all([
    setAppSetting('watermark_enabled', config.enabled ? '1' : '0'),
    setAppSetting('watermark_fields', JSON.stringify(config.fields)),
  ]);
}
