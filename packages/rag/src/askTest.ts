// CLI test for RAG Q&A. Run: npm run ask -w @recallai/rag -- "your question"
import { askQuestion } from './ask.js';

const question = process.argv[2] ?? 'What work was done on SSL certificates?';

async function main() {
  console.log(`\n🧠 RecallAI — asking: "${question}"\n`);
  console.log('Thinking...\n');

  const { answer, sources } = await askQuestion(question);

  console.log('━'.repeat(60));
  console.log('ANSWER:');
  console.log('━'.repeat(60));
  console.log(answer);
  console.log('\n' + '━'.repeat(60));
  console.log('SOURCES:');
  console.log('━'.repeat(60));
  for (const s of sources) {
    console.log(`  [${s.score.toFixed(3)}] (${s.source}) ${s.text.slice(0, 100)}…`);
  }
  console.log();
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
