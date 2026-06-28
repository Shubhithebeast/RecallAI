/**
 * Tiny helper to SEE what's in the database (keyword search via SQLite LIKE).
 * Note: this is plain text matching, NOT the smart vector search (that's M6).
 *
 * Run:  npm run query -w @recallai/connectors -- "session"
 */
import { searchDocumentsByText, countDocuments } from '@recallai/db';

const term = process.argv[2] ?? 'session';

console.log(`\nTotal 'git' documents stored: ${countDocuments('git')}`);
console.log(`\nKeyword search for "${term}" (top 5):\n`);

const rows = searchDocumentsByText(term, 5);
if (rows.length === 0) {
  console.log('  (no matches)');
} else {
  for (const r of rows) {
    console.log(`  • ${(r.created_at ?? '').slice(0, 10)}  ${r.title}`);
    console.log(`      ${r.author}`);
  }
}
console.log('');
