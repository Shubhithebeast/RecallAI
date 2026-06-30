// Splits long text into overlapping chunks for embedding.
// Short texts (like commit messages) stay as one chunk.

export interface Chunk {
  id: string;       // "docId#0", "docId#1", ...
  docId: string;    // links back to the SQLite document
  text: string;
  source: string;
  index: number;    // chunk position within the document
}

const DEFAULT_SIZE = 500;   // chars per chunk
const DEFAULT_OVERLAP = 100; // overlap between chunks
const MAX_CONTENT = 50_000;  // cap huge files (like 23MB .har)

export function chunkText(
  docId: string,
  content: string,
  source: string,
  size = DEFAULT_SIZE,
  overlap = DEFAULT_OVERLAP,
): Chunk[] {
  // Cap huge content
  const text = content.length > MAX_CONTENT ? content.slice(0, MAX_CONTENT) : content;
  if (!text.trim()) return [];

  // If short enough, one chunk
  if (text.length <= size) {
    return [{ id: `${docId}#0`, docId, text, source, index: 0 }];
  }

  const chunks: Chunk[] = [];
  let start = 0;
  let idx = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push({ id: `${docId}#${idx}`, docId, text: text.slice(start, end), source, index: idx });
    start += size - overlap;
    idx++;
  }
  return chunks;
}
