/**
 * Shared types — the "contracts" every part of RecallAI agrees on.
 */

/**
 * A single piece of content pulled from ANY source (git commit, doc, page…).
 * Connectors produce these; the database stores them. One common shape.
 */
export interface SourceItem {
  /** Unique id WITHIN the source (e.g. commit hash, page id, file path). */
  externalId: string;
  /** Which connector produced it: 'git' | 'files' | 'confluence' | … */
  source: string;
  /** Short human title (e.g. commit subject line). */
  title: string;
  /** The full text we will later index/search. */
  content: string;
  /** Optional link back to the original. */
  url?: string;
  /** Optional author (e.g. "Name <email>"). */
  author?: string;
  /** Optional ISO date string. */
  createdAt?: string;
  /** Anything extra, source-specific (repo name, file path, status…). */
  metadata: Record<string, unknown>;
}

/**
 * The plugin contract. EVERY data source (git, confluence, valueedge…)
 * implements this. Add a new source = add one object that implements this.
 */
export interface BaseConnector {
  /** Stable name of the source, e.g. 'git'. */
  name: string;
  /** Fetch items from the source. `config` is connector-specific. */
  fetchItems(config: unknown): Promise<SourceItem[]>;
}
