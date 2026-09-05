# RecallAI — DevBrain

> Your Developer Second Brain. A **local, private RAG system** that indexes your dev work
> (Git, files, Confluence, ValueEdge…) and answers questions in plain English — **with sources**.

## Status
The current product is a **local MCP agent**, not a web application. It indexes Git
commits and local files, searches them with LanceDB, and answers questions through
Ollama with source context. The React/Express web app is still a later interface.

Current completed pieces: Git and file connectors, SQLite document storage, chunking,
Ollama embeddings, LanceDB vector search, RAG Q&A, and an MCP server for Copilot.

## Documentation
| Doc | What's inside |
|-----|---------------|
| [documentation.txt](documentation.txt) | Master vision (features, phases) |
| [docs/01-system-design.md](docs/01-system-design.md) | Architecture + diagrams + tech stack |
| [docs/02-requirements.md](docs/02-requirements.md) | Functional + non-functional requirements |
| [docs/03-roadmap.md](docs/03-roadmap.md) | Phases, milestones, definitions of done |
| [docs/04-learning-plan.md](docs/04-learning-plan.md) | Learn RAG/AI just-in-time |
| [docs/05-data-privacy.md](docs/05-data-privacy.md) | Keeping company data safe |

## Tech stack
TypeScript · npm workspaces · SQLite · LanceDB · **Ollama (local AI)** · MCP

## Quick start: use RecallAI as a Copilot agent

### Prerequisites

- Node.js 22+ (Node 24 is recommended; the project uses Node's built-in SQLite API)
- Ollama installed and running
- Models available locally:

```powershell
ollama pull nomic-embed-text
ollama pull llama3.2:3b
```

### Install

From the repository root:

```powershell
npm install
```

The checked-in `.vscode/mcp.json` registers RecallAI automatically when this folder
is opened in VS Code. Reload Copilot agent tools if the server does not appear.

### Index data

Index a local Git repository and/or a folder containing documents:

```powershell
npm run index:git -w @recallai/connectors -- "C:\path\to\repo"
npm run index:files -w @recallai/connectors -- "C:\path\to\documents"
npm run embed -w @recallai/rag
```

The first two commands save raw content in `data/recallai.db`. The embed command
creates local vectors in `data/lancedb/`. These folders contain indexed data and
must not be committed or shared.

For a different Ollama URL, copy the following into a local `.env` file:

```text
OLLAMA_BASE_URL=http://localhost:11434
# SQLITE_PATH=
# LANCEDB_PATH=
```

### Verify without Copilot

```powershell
npm run search -w @recallai/rag -- "What changed in authentication?"
npm run ask -w @recallai/rag -- "What changed in authentication?"
```

The MCP server can also be started directly for diagnostics:

```powershell
npm run agent
```

It uses stdio, so a running process with no normal console output is expected.

## MCP Agent Setup (Use RecallAI from AI tools)

RecallAI exposes an MCP (Model Context Protocol) server — any compatible AI tool can use it as a knowledge source.

### Cursor

Create `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "recallai": {
      "command": "npx",
      "args": ["tsx", "packages/rag/src/mcp.ts"]
    }
  }
}
```

### Claude Desktop

Edit `%APPDATA%/Claude/claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac):
```json
{
  "mcpServers": {
    "recallai": {
      "command": "npx",
      "args": ["tsx", "<ABSOLUTE_PATH_TO_PROJECT>/packages/rag/src/mcp.ts"]
    }
  }
}
```

### IntelliJ (JetBrains AI)

MCP support is experimental. Add in Settings → Tools → AI Assistant → MCP Servers:
- Command: `npx`
- Args: `tsx packages/rag/src/mcp.ts`
- Working dir: project root

### Available Tools

| Tool | Description |
|------|-------------|
| `search_knowledge` | Semantic search across your indexed knowledge (git, files, docs) |
| `ask_recallai` | Full RAG Q&A — asks a question, returns answer with source citations |