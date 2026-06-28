/**
 * Ollama client — talks to the LOCAL Ollama server (default http://localhost:11434).
 *
 * Two things our RAG system needs from the AI:
 *   1. embed(text)  -> turns text into a vector (list of numbers) for similarity search
 *   2. chat(prompt) -> generates a natural-language answer
 *
 * No API keys, no internet — everything runs on your machine.
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

/** Model that converts text -> vector. Small + fast + good quality. */
export const EMBED_MODEL = 'nomic-embed-text';

/** Model that writes answers. Small/fast to start; we can upgrade later. */
export const CHAT_MODEL = 'llama3.2:3b';

/** Turn a piece of text into an embedding vector. */
export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  if (!res.ok) {
    throw new Error(`Ollama embeddings failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

/** Generate an answer from a prompt (optionally with a system instruction). */
export async function chat(prompt: string, system?: string): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CHAT_MODEL,
      stream: false,
      messages: [
        ...(system ? [{ role: 'system' as const, content: system }] : []),
        { role: 'user' as const, content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama chat failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { message: { content: string } };
  return data.message.content;
}

/**
 * Cosine similarity between two vectors → a number from -1 to 1.
 * Higher = more similar in meaning. This is the math behind "find related text".
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
