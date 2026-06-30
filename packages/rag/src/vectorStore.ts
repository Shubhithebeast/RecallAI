// Wrapper around LanceDB (embedded vector DB). Swapping engines = change only this file.
import * as lancedb from '@lancedb/lancedb';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');

export interface VectorRecord {
  id: string;
  text: string;
  source: string;
  vector: number[];
}

export interface SearchHit {
  id: string;
  text: string;
  source: string;
  score: number;
}

const DB_PATH = process.env.LANCEDB_PATH ?? resolve(ROOT, 'data', 'lancedb');
const TABLE = 'chunks';

export async function upsertVectors(records: VectorRecord[]): Promise<void> {
  const db = await lancedb.connect(DB_PATH);
  const data = records as unknown as Record<string, unknown>[];
  const names = await db.tableNames();
  if (names.includes(TABLE)) {
    const table = await db.openTable(TABLE);
    await table.add(data);
  } else {
    await db.createTable(TABLE, data);
  }
}

export async function searchVectors(queryVector: number[], k = 3): Promise<SearchHit[]> {
  const db = await lancedb.connect(DB_PATH);
  const table = await db.openTable(TABLE);
  const query = table.search(queryVector) as lancedb.VectorQuery;
  const rows = await query.distanceType('cosine').limit(k).toArray();
  // LanceDB returns distance (0 = identical); convert to similarity.
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    text: String(r.text),
    source: String(r.source),
    score: 1 - Number(r._distance ?? 0),
  }));
}

export async function resetStore(): Promise<void> {
  const db = await lancedb.connect(DB_PATH);
  const names = await db.tableNames();
  if (names.includes(TABLE)) {
    await db.dropTable(TABLE);
  }
}
