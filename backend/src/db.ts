import Database, { Database as DatabaseType, Statement } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DEFAULT_STORAGE_AREAS, StorageArea, PantryItem } from './types';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'pantry.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS storage_areas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    "order" INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    storage_area_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    is_opened INTEGER NOT NULL DEFAULT 0,
    opened_at INTEGER,
    expiry_date TEXT,
    FOREIGN KEY (storage_area_id) REFERENCES storage_areas(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_items_storage_area ON items(storage_area_id);
`);

// Initialize with default storage areas if empty
const areaCount = db.prepare('SELECT COUNT(*) as count FROM storage_areas').get() as { count: number };
if (areaCount.count === 0) {
  const insertArea = db.prepare(`
    INSERT INTO storage_areas (id, name, icon, color, "order")
    VALUES (@id, @name, @icon, @color, @order)
  `);
  
  const insertMany = db.transaction((areas: StorageArea[]) => {
    for (const area of areas) {
      insertArea.run(area);
    }
  });
  
  insertMany(DEFAULT_STORAGE_AREAS);
}

// Storage Area queries
interface StorageAreaQueries {
  getAll: Statement;
  getById: Statement;
  insert: Statement;
  update: Statement;
  delete: Statement;
  getMaxOrder: Statement;
  updateOrder: Statement;
}

export const storageAreaQueries: StorageAreaQueries = {
  getAll: db.prepare(`
    SELECT id, name, icon, color, "order" as "order"
    FROM storage_areas
    ORDER BY "order" ASC
  `),
  
  getById: db.prepare(`
    SELECT id, name, icon, color, "order" as "order"
    FROM storage_areas
    WHERE id = ?
  `),
  
  insert: db.prepare(`
    INSERT INTO storage_areas (id, name, icon, color, "order")
    VALUES (@id, @name, @icon, @color, @order)
  `),
  
  update: db.prepare(`
    UPDATE storage_areas
    SET name = @name, icon = @icon, color = @color, "order" = @order
    WHERE id = @id
  `),
  
  delete: db.prepare('DELETE FROM storage_areas WHERE id = ?'),
  
  getMaxOrder: db.prepare('SELECT MAX("order") as maxOrder FROM storage_areas'),
  
  updateOrder: db.prepare('UPDATE storage_areas SET "order" = @order WHERE id = @id'),
};

// Item queries
interface ItemQueries {
  getAll: Statement;
  getByStorageArea: Statement;
  getById: Statement;
  findMergeable: Statement;
  insert: Statement;
  updateQuantity: Statement;
  update: Statement;
  delete: Statement;
  deleteByStorageArea: Statement;
}

export const itemQueries: ItemQueries = {
  getAll: db.prepare(`
    SELECT id, name, quantity, storage_area_id as storageAreaId,
           created_at as createdAt, is_opened as isOpened,
           opened_at as openedAt, expiry_date as expiryDate
    FROM items
    ORDER BY name ASC
  `),
  
  getByStorageArea: db.prepare(`
    SELECT id, name, quantity, storage_area_id as storageAreaId,
           created_at as createdAt, is_opened as isOpened,
           opened_at as openedAt, expiry_date as expiryDate
    FROM items
    WHERE storage_area_id = ?
    ORDER BY name ASC
  `),
  
  getById: db.prepare(`
    SELECT id, name, quantity, storage_area_id as storageAreaId,
           created_at as createdAt, is_opened as isOpened,
           opened_at as openedAt, expiry_date as expiryDate
    FROM items
    WHERE id = ?
  `),
  
  findMergeable: db.prepare(`
    SELECT id, name, quantity, storage_area_id as storageAreaId,
           created_at as createdAt, is_opened as isOpened,
           opened_at as openedAt, expiry_date as expiryDate
    FROM items
    WHERE storage_area_id = @storageAreaId
      AND LOWER(name) = LOWER(@name)
      AND is_opened = 0
      AND (expiry_date = @expiryDate OR (expiry_date IS NULL AND @expiryDate IS NULL))
    LIMIT 1
  `),
  
  insert: db.prepare(`
    INSERT INTO items (id, name, quantity, storage_area_id, created_at, is_opened, opened_at, expiry_date)
    VALUES (@id, @name, @quantity, @storageAreaId, @createdAt, @isOpened, @openedAt, @expiryDate)
  `),
  
  updateQuantity: db.prepare('UPDATE items SET quantity = @quantity WHERE id = @id'),
  
  update: db.prepare(`
    UPDATE items
    SET name = @name, quantity = @quantity, is_opened = @isOpened,
        opened_at = @openedAt, expiry_date = @expiryDate
    WHERE id = @id
  `),
  
  delete: db.prepare('DELETE FROM items WHERE id = ?'),
  
  deleteByStorageArea: db.prepare('DELETE FROM items WHERE storage_area_id = ?'),
};

// Helper to convert SQLite boolean (0/1) to JS boolean
export function mapItem(row: unknown): PantryItem {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    quantity: r.quantity as number,
    storageAreaId: r.storageAreaId as string,
    createdAt: r.createdAt as number,
    isOpened: Boolean(r.isOpened),
    openedAt: r.openedAt as number | undefined,
    expiryDate: r.expiryDate as string | undefined,
  };
}

export function mapStorageArea(row: unknown): StorageArea {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    icon: r.icon as StorageArea['icon'],
    color: r.color as StorageArea['color'],
    order: r.order as number,
  };
}

// Transaction helper for reordering
export function reorderAreas(ids: string[]): void {
  const transaction = db.transaction((areaIds: string[]) => {
    areaIds.forEach((id, index) => {
      storageAreaQueries.updateOrder.run({ id, order: index });
    });
  });
  transaction(ids);
}

export default db;
