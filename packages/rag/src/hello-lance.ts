// LanceDB persistence demo: store vectors on disk, then search.
// Run: npm run hello:lance -w @recallai/rag
import { embed, chat, EMBED_MODEL, CHAT_MODEL } from './ollama.js';
import { upsertVectors, searchVectors, resetStore } from './vectorStore.js';

const documents = [
  { id: 'doc1', source: 'notes', text: 'The PM2 migration moved our Node services to PM2 for zero-downtime restarts and log management.' },
  { id: 'doc2', source: 'notes', text: 'The SSL certificate issue was fixed by adding the missing intermediate certificate to the chain.' },
  { id: 'doc3', source: 'notes', text: 'Team standup is every weekday at 9:30 AM over Teams.' },
  { id: 'doc4', source: 'notes', text: 'The database was switched from MySQL to SQLite for the local-first desktop build.' },
];

const question = 'How did we solve the SSL problem?';

async function main() {
  console.log(`\n=== RecallAI · M2 LanceDB persistence demo ===`);
  console.log(`Embed: ${EMBED_MODEL}   Chat: ${CHAT_MODEL}\n`);

  await resetStore();

  console.log('1) Embedding + storing documents in LanceDB…');
  const records = await Promise.all(
    documents.map(async (d) => ({ ...d, vector: await embed(d.text) })),
  );
  await upsertVectors(records);
  console.log(`   Stored ${records.length} vectors on disk (data/lancedb).\n`);

  console.log(`2) Question: "${question}"`);
  const qVector = await embed(question);
  const hits = await searchVectors(qVector, 3);
  console.log('   Top matches from LanceDB (higher score = more relevant):');
  for (const h of hits) {
    console.log(`   ${h.score.toFixed(3)}  [${h.id}] ${h.text}`);
  }
  const best = hits[0];
  console.log(`\n   -> Best match: [${best.id}] "${best.text}"\n`);

  console.log('3) Asking the chat model, grounded on that match…');
  const answer = await chat(
    `Context:\n${best.text}\n\nQuestion: ${question}\n\nAnswer using ONLY the context above.`,
    'You are a precise assistant. Answer briefly using only the provided context.',
  );
  console.log(`\n   Answer: ${answer.trim()}\n`);
  console.log('=== done ===\n');
}

main().catch((err) => {
  console.error('\nError:', err.message);
  console.error('Is Ollama running? Try:  ollama list');
  process.exit(1);
});
