// Client for the local Ollama server (embeddings + chat).
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

export const EMBED_MODEL = 'nomic-embed-text';
export const CHAT_MODEL = 'llama3.2:3b';

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

// Cosine similarity (-1..1): higher = more similar in meaning.
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
