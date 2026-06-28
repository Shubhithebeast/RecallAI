/**
 * Vector store — our wrapper around LanceDB (an EMBEDDED vector database).
 *
 * Why a wrapper? So the rest of the app talks to simple functions
 * (upsertVectors / searchVectors) and never knows the engine is LanceDB.
 * If we ever swap the engine, ONLY this file changes. (Strategy pattern.)
 *
 * LanceDB stores data in a local folder (no server needed) → local-first.
 */
import * as lancedb from '@lancedb/lancedb';

/** One stored item: an id, the readable text, and its embedding vector. */
export interface VectorRecord {
  id: string;
  text: string;
  source: string;
  vector: number[];
}

/** A search result: the matched item plus a similarity score (higher = closer). */
export interface SearchHit {
  id: string;
  text: string;
  source: string;
  score: number;
}

// Where LanceDB keeps its files. Lives under data/ (git-ignored).
const DB_PATH = process.env.LANCEDB_PATH ?? './data/lancedb';
const TABLE = 'chunks';

/** Insert records, creating the table on first use, appending afterwards. */
export async function upsertVectors(records: VectorRecord[]): Promise<void> {
  const db = await lancedb.connect(DB_PATH);
  // LanceDB's types want plain row objects; our typed records match at runtime.
  const data = records as unknown as Record<string, unknown>[];
  const names = await db.tableNames();
  if (names.includes(TABLE)) {
    const table = await db.openTable(TABLE);
    await table.add(data);
  } else {
    await db.createTable(TABLE, data);
  }
}

/** Find the k records whose vectors are most similar to queryVector. */
export async function searchVectors(queryVector: number[], k = 3): Promise<SearchHit[]> {
  const db = await lancedb.connect(DB_PATH);
  const table = await db.openTable(TABLE);
  // search() returns a VectorQuery when given a vector; cast so TS exposes the
  // vector-specific methods like distanceType().
  const query = table.search(queryVector) as lancedb.VectorQuery;
  const rows = await query
    .distanceType('cosine') // compare by meaning (direction), not raw size
    .limit(k)
    .toArray();

  // LanceDB returns a cosine DISTANCE (0 = identical). Convert to a
  // similarity score (1 = identical) so higher = better, like before.
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    text: String(r.text),
    source: String(r.source),
    score: 1 - Number(r._distance ?? 0),
  }));
}

/** Delete everything (handy for clean re-indexing demos). */
export async function resetStore(): Promise<void> {
  const db = await lancedb.connect(DB_PATH);
  const names = await db.tableNames();
  if (names.includes(TABLE)) {
    await db.dropTable(TABLE);
  }
}
