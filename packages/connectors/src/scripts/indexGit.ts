// Index a local git repo's commits into SQLite.
// Run: npm run index:git -w @recallai/connectors -- "<repoPath>"
import { gitConnector, type GitConnectorConfig } from '../gitConnector.js';
import { upsertDocuments, countDocuments } from '@recallai/db';

const DEFAULT_REPO =
  'C:/Users/sbisht/OneDrive - OpenText/Opentext/Contentconnect/26.2';

const repoPath = process.argv[2] ?? DEFAULT_REPO;

async function main() {
  const config: GitConnectorConfig = { repoPath };

  console.log('\n=== RecallAI · M3 Git indexer ===');
  console.log(`Repo: ${repoPath}\n`);

  console.log('1) Reading commits from the local repo…');
  const started = Date.now();
  const items = await gitConnector.fetchItems(config);
  console.log(`   Found ${items.length} commits in ${((Date.now() - started) / 1000).toFixed(1)}s.`);

  console.log('2) Saving to SQLite…');
  const n = upsertDocuments(items);
  console.log(`   Upserted ${n} documents.`);
  console.log(`   Total 'git' documents in DB: ${countDocuments('git')}`);

  console.log('\n3) Sample (latest 3 commits):');
  for (const it of items.slice(0, 3)) {
    console.log(`   • ${(it.createdAt ?? '').slice(0, 10)}  ${it.title}`);
    console.log(`       ${it.author}`);
  }

  console.log('\n=== done ===\n');
}

main().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
