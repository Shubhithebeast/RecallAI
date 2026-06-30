// M5: Embed pipeline — reads documents from SQLite, chunks, embeds, stores in LanceDB.
// Run: npm run embed -w @recallai/rag
import { getDb } from '@recallai/db';
import { chunkText, type Chunk } from './chunker.js';
import { embed } from './ollama.js';
import { upsertVectors, resetStore, type VectorRecord } from './vectorStore.js';

const BATCH_SIZE = 20; // embed this many chunks at once (avoid OOM on huge sets)

async function embedBatch(chunks: Chunk[]): Promise<VectorRecord[]> {
  const records: VectorRecord[] = [];
  for (const c of chunks) {
    const vector = await embed(c.text);
    records.push({ id: c.id, text: c.text, source: c.source, vector });
  }
  return records;
}

async function main() {
  console.log('\n=== RecallAI · M5 Embed pipeline ===\n');

  // 1) Read all documents from SQLite
  const db = getDb();
  const docs = db.prepare('SELECT id, source, content FROM documents').all() as {
    id: string; source: string; content: string | null;
  }[];
  console.log(`1) ${docs.length} documents in SQLite.`);

  // 2) Chunk them all
  const allChunks: Chunk[] = [];
  for (const doc of docs) {
    if (!doc.content) continue;
    allChunks.push(...chunkText(doc.id, doc.content, doc.source));
  }
  console.log(`2) ${allChunks.length} chunks after splitting.`);

  // 3) Reset LanceDB (clean re-embed for now; incremental later)
  await resetStore();
  console.log('3) LanceDB cleared for fresh embed.');

  // 4) Embed + store in batches
  console.log(`4) Embedding ${allChunks.length} chunks (batch=${BATCH_SIZE})…`);
  let done = 0;
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const records = await embedBatch(batch);
    await upsertVectors(records);
    done += records.length;
    if (done % 100 === 0 || done === allChunks.length) {
      process.stdout.write(`   ${done}/${allChunks.length} embedded\r`);
    }
  }
  console.log(`\n   Done. ${done} vectors stored in LanceDB.`);
  console.log('\n=== done ===\n');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
