// M6: RAG Q&A — embed question → search vectors → prompt Ollama → answer with sources.
import { embed, chat } from './ollama.js';
import { searchVectors, type SearchHit } from './vectorStore.js';

export interface AskResult {
  answer: string;
  sources: SearchHit[];
}

const SYSTEM_PROMPT = `You are RecallAI, a knowledge assistant that answers questions based ONLY on the provided context.

Rules:
- Answer ONLY from the context below. Do not make up information.
- If the context doesn't contain enough info, say "I don't have enough information about this."
- Be concise and direct.
- At the end, mention which source(s) you used (e.g. "Source: git commit about SSL fix").`;

function buildUserPrompt(question: string, hits: SearchHit[]): string {
  const context = hits
    .map((h, i) => `[${i + 1}] (${h.source}, score: ${h.score.toFixed(3)}) ${h.text}`)
    .join('\n\n');

  return `Context:\n${context}\n\nQuestion: ${question}`;
}

export async function askQuestion(question: string, topK = 5): Promise<AskResult> {
  // 1) Embed the question
  const queryVec = await embed(question);

  // 2) Search LanceDB for similar chunks
  const hits = await searchVectors(queryVec, topK);

  // 3) Build prompt with context + question
  const userPrompt = buildUserPrompt(question, hits);

  // 4) Call Ollama chat
  const answer = await chat(userPrompt, SYSTEM_PROMPT);

  return { answer, sources: hits };
}
