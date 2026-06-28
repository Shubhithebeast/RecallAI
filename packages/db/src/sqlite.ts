/**
 * SQLite store — the "source of truth" for readable text + facts.
 *
 * Uses Node's BUILT-IN sqlite (node:sqlite) — no native dependency to compile.
 * This holds documents (commits, files, pages…). Vectors live separately in
 * LanceDB; the two are linked by a shared id.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SourceItem } from '@recallai/shared';

const DB_FILE = process.env.SQLITE_PATH ?? './data/recallai.db';

let db: DatabaseSync | null = null;

/** Open the database (creating the file + schema on first use). */
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

/** One row as stored in SQLite. */
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

/**
 * Insert or update many items in one transaction.
 * Idempotent: re-running with the same items updates instead of duplicating
 * (thanks to the UNIQUE(source, external_id) constraint).
 */
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

/** Count documents, optionally filtered by source. */
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

/** Fetch one document by its composite id (e.g. "git:<hash>"). */
export function getDocumentById(id: string): DocumentRow | undefined {
  const database = getDb();
  return database.prepare('SELECT * FROM documents WHERE id = ?').get(id) as unknown as
    | DocumentRow
    | undefined;
}

/** Simple keyword search (LIKE) — a basic fallback before vector search. */
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
