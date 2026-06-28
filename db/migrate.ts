import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import type * as SQLite from 'expo-sqlite';

import { MIGRATIONS, type MigrationEntry } from './migrations/manifest';

async function loadMigrationSql(assetModule: number): Promise<string> {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error('Migration asset has no local URI after download');
  }
  return FileSystem.readAsStringAsync(asset.localUri);
}

async function applyLegacyWatermarkPatch(db: SQLite.SQLiteDatabase): Promise<void> {
  const photoColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(photo)');
  const hasWatermarkVersion = photoColumns.some(col => col.name === 'watermark_version');
  if (!hasWatermarkVersion) {
    await db.execAsync('ALTER TABLE photo ADD COLUMN watermark_version INTEGER NOT NULL DEFAULT 1');
  }
}

async function applyMigration(db: SQLite.SQLiteDatabase, migration: MigrationEntry): Promise<void> {
  const sql = await loadMigrationSql(migration.asset);

  try {
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
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
