// RAG demo (in-memory): embed docs -> similarity search -> grounded answer.
// Run: npm run hello -w @recallai/rag
import { embed, chat, cosineSimilarity, EMBED_MODEL, CHAT_MODEL } from './ollama.js';

const documents = [
  'The PM2 migration moved our Node services to PM2 for zero-downtime restarts and log management.',
  'The SSL certificate issue was fixed by adding the missing intermediate certificate to the chain.',
  'Team standup is every weekday at 9:30 AM over Teams.',
  'The database was switched from MySQL to SQLite for the local-first desktop build.',
];

const question = 'How did we solve the SSL problem?';

async function main() {
  console.log(`\n=== RecallAI · M2 RAG hello-world ===`);
  console.log(`Embed model: ${EMBED_MODEL}   Chat model: ${CHAT_MODEL}\n`);

  console.log('1) Embedding documents…');
  const docVectors = await Promise.all(documents.map((d) => embed(d)));
  console.log(`   Each document became a vector of ${docVectors[0].length} numbers.`);
  console.log(`   First doc, first 5 numbers: [${docVectors[0].slice(0, 5).map((n) => n.toFixed(3)).join(', ')}, …]\n`);

  console.log(`2) Question: "${question}"`);
  const qVector = await embed(question);
  const ranked = documents
    .map((doc, i) => ({ doc, score: cosineSimilarity(qVector, docVectors[i]) }))
    .sort((a, b) => b.score - a.score);

  console.log('   Similarity ranking (higher = more relevant):');
  for (const { doc, score } of ranked) {
    console.log(`   ${score.toFixed(3)}  ${doc}`);
  }
  const best = ranked[0];
  console.log(`\n   -> Best match: "${best.doc}"\n`);

  console.log('3) Asking the chat model, grounded on that context…');
  const answer = await chat(
    `Context:\n${best.doc}\n\nQuestion: ${question}\n\nAnswer using ONLY the context above.`,
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
