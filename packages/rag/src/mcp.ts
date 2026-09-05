// RecallAI MCP Server — exposes RAG tools over stdio for Copilot/Claude Desktop.
// CRITICAL: Never use console.log() here — it corrupts the stdio JSON-RPC protocol.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { embed } from './ollama.js';
import { searchVectors } from './vectorStore.js';
import { askQuestion } from './ask.js';

const server = new McpServer({
  name: 'recallai',
  version: '0.1.0',
});

// Tool 1: search_knowledge — raw semantic search, returns top chunks with scores
server.tool(
  'search_knowledge',
  'Search the RecallAI knowledge base (git commits, files, docs) using semantic similarity. Returns the most relevant chunks.',
  { query: z.string().describe('The search query (natural language)'), limit: z.number().optional().describe('Number of results (default 5)') },
  async ({ query, limit }) => {
    const vec = await embed(query);
    const hits = await searchVectors(vec, limit ?? 5);
    const text = hits
      .map((h, i) => `[${i + 1}] (score: ${h.score.toFixed(3)}, source: ${h.source})\n${h.text}`)
      .join('\n\n');
    return { content: [{ type: 'text', text: text || 'No results found.' }] };
  },
);

// Tool 2: ask_recallai — full RAG Q&A with answer + cited sources
server.tool(
  'ask_recallai',
  'Ask a question to RecallAI. It searches your local knowledge base (git history, files, docs) and generates an answer with source citations. 100% local, data never leaves your machine.',
  { question: z.string().describe('The question to ask') },
  async ({ question }) => {
    const { answer, sources } = await askQuestion(question);
    const sourcesText = sources
      .map((s, i) => `  [${i + 1}] (${s.source}, ${s.score.toFixed(3)}) ${s.text.slice(0, 120)}`)
      .join('\n');
    const text = `${answer}\n\n---\nSources:\n${sourcesText}`;
    return { content: [{ type: 'text', text }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('RecallAI MCP server running on stdio');
}

main().catch((err) => {
  console.error('MCP Fatal:', err);
  process.exit(1);
});
