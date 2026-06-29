// Indexes local files from a folder into SQLite.
// Run: npm run index:files -w @recallai/connectors -- "<folder>"
import { fileConnector, type FileConnectorConfig } from '../fileConnector.js';
import { upsertDocuments, countDocuments } from '@recallai/db';

const folderPath = process.argv[2] ?? '.';

async function main() {
  console.log('\n=== RecallAI · M4 File indexer ===');
  console.log(`Folder: ${folderPath}\n`);

  console.log('1) Scanning + extracting text…');
  const items = await fileConnector.fetchItems({ folderPath } satisfies FileConnectorConfig);
  console.log(`   Extracted ${items.length} files.`);

  console.log('2) Saving to SQLite…');
  const n = upsertDocuments(items);
  console.log(`   Upserted ${n} documents.`);
  console.log(`   Total 'files' documents in DB: ${countDocuments('files')}`);

  console.log('\n3) Files indexed:');
  for (const it of items) {
    console.log(`   • ${it.title}  (${it.content.length} chars)`);
  }
  console.log('\n=== done ===\n');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
