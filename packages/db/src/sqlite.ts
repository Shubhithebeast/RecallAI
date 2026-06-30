// SQLite store (Node's built-in node:sqlite) for documents/facts. Vectors live in LanceDB.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SourceItem } from '@recallai/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');
const DB_FILE = process.env.SQLITE_PATH ?? resolve(ROOT, 'data', 'recallai.db');

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(DB_FILE), { recursive: true });
  db = new DatabaseSync(DB_FILE);
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id          TEXT PRIMARY KEY,
      source      TEXT NOT NULL,
      external_id TEXT NOT NULL,
      title       TEXT,
      content     TEXT,
      url         TEXT,
      author      TEXT,
      created_at  TEXT,
      metadata    TEXT,
      UNIQUE(source, external_id)
    );
  `);
  return db;
}

export interface DocumentRow {
  id: string;
  source: string;
  external_id: string;
  title: string | null;
  content: string | null;
  url: string | null;
  author: string | null;
  created_at: string | null;
  metadata: string | null;
}

// Idempotent bulk upsert in a single transaction.
export function upsertDocuments(items: SourceItem[]): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO documents (id, source, external_id, title, content, url, author, created_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, external_id) DO UPDATE SET
      title=excluded.title, content=excluded.content, url=excluded.url,
      author=excluded.author, created_at=excluded.created_at, metadata=excluded.metadata
  `);

  let count = 0;
  database.exec('BEGIN');
  try {
    for (const it of items) {
      const id = `${it.source}:${it.externalId}`;
      stmt.run(
        id,
        it.source,
        it.externalId,
        it.title ?? null,
        it.content ?? null,
        it.url ?? null,
        it.author ?? null,
        it.createdAt ?? null,
        JSON.stringify(it.metadata ?? {}),
      );
      count++;
    }
    database.exec('COMMIT');
  } catch (err) {
    database.exec('ROLLBACK');
    throw err;
  }
  return count;
}

export function countDocuments(source?: string): number {
  const database = getDb();
  if (source) {
    const row = database
      .prepare('SELECT COUNT(*) AS n FROM documents WHERE source = ?')
      .get(source) as { n: number };
    return row.n;
  }
  const row = database.prepare('SELECT COUNT(*) AS n FROM documents').get() as { n: number };
  return row.n;
}

export function getDocumentById(id: string): DocumentRow | undefined {
  const database = getDb();
  return database.prepare('SELECT * FROM documents WHERE id = ?').get(id) as unknown as
    | DocumentRow
    | undefined;
}

// Keyword search (LIKE), not vector search.
export function searchDocumentsByText(query: string, limit = 5): DocumentRow[] {
  const database = getDb();
  const like = `%${query}%`;
  return database
    .prepare(
      `SELECT * FROM documents
       WHERE title LIKE ? OR content LIKE ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(like, like, limit) as unknown as DocumentRow[];
}
