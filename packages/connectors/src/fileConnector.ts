// Reads local files (PDF/DOCX/MD/TXT) from a folder. Implements BaseConnector.
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname, relative, basename } from 'node:path';
import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';
import * as XLSX from 'xlsx';
import type { SourceItem, BaseConnector } from '@recallai/shared';

export interface FileConnectorConfig {
  folderPath: string;
}

// Formats that are already plain text inside (just read them directly).
const TEXT_EXTS = new Set([
  '.txt', '.md', '.log', '.json', '.har',
  '.html', '.htm', '.xml', '.csv', '.yaml', '.yml',
]);
// Binary formats that need a parser.
const BINARY_EXTS = new Set(['.pdf', '.docx', '.xlsx', '.xls']);
const SUPPORTED = new Set([...TEXT_EXTS, ...BINARY_EXTS]);
const SKIP_DIRS = new Set(['node_modules', '.git', 'data', 'dist', 'build']);

async function walk(dir: string, acc: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(full, acc);
    } else if (SUPPORTED.has(extname(entry.name).toLowerCase())) {
      acc.push(full);
    }
  }
  return acc;
}

async function extractFileText(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase();
  if (TEXT_EXTS.has(ext)) return readFile(filePath, 'utf8');
  if (ext === '.pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(await readFile(filePath)));
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join('\n') : text;
  }
  if (ext === '.docx') {
    return (await mammoth.extractRawText({ path: filePath })).value;
  }
  if (ext === '.xlsx' || ext === '.xls') {
    const wb = XLSX.read(await readFile(filePath));
    return wb.SheetNames
      .map((name) => `# ${name}\n${XLSX.utils.sheet_to_csv(wb.Sheets[name])}`)
      .join('\n\n');
  }
  return '';
}

export const fileConnector: BaseConnector = {
  name: 'files',

  async fetchItems(config: unknown): Promise<SourceItem[]> {
    const { folderPath } = config as FileConnectorConfig;
    const items: SourceItem[] = [];

    for (const filePath of await walk(folderPath)) {
      const text = (await extractFileText(filePath)).trim();
      if (!text) continue;
      const info = await stat(filePath);
      items.push({
        externalId: relative(folderPath, filePath),
        source: 'files',
        title: basename(filePath),
        content: text,
        createdAt: info.mtime.toISOString(),
        metadata: { path: filePath, ext: extname(filePath).toLowerCase() },
      });
    }
    return items;
  },
};
