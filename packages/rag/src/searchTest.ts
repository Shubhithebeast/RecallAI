// Verify M5: embed a question → search LanceDB → show top matches.
// Run: npm run search -w @recallai/rag -- "your question here"
import { embed } from './ollama.js';
import { searchVectors } from './vectorStore.js';

const query = process.argv[2] ?? 'SSL certificate issue';

async function main() {
  console.log(`\nQuery: "${query}"\n`);
  const vec = await embed(query);
  const hits = await searchVectors(vec, 5);
  console.log(`Top ${hits.length} matches:\n`);
  for (const h of hits) {
    console.log(`  [${h.score.toFixed(3)}] (${h.source}) ${h.text.slice(0, 120)}…`);
  }
  console.log();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
