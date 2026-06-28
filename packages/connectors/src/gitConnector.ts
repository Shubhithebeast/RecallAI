/**
 * Git connector — reads commit history from a LOCAL repository (no token, no
 * network). Implements the BaseConnector contract, so it plugs into the same
 * pipeline every other source will use.
 */
import { simpleGit, type LogResult, type DefaultLogFields } from 'simple-git';
import type { SourceItem, BaseConnector } from '@recallai/shared';

export interface GitConnectorConfig {
  /** Absolute path to a local git repository. */
  repoPath: string;
  /** Optional: limit number of commits (newest first). */
  maxCount?: number;
  /** Optional: only commits by this author (name or email substring). */
  author?: string;
}

/** Turn a folder path into a short repo name for metadata. */
function repoNameFromPath(repoPath: string): string {
  return repoPath.split(/[\\/]/).filter(Boolean).pop() ?? 'repo';
}

export const gitConnector: BaseConnector = {
  name: 'git',

  async fetchItems(config: unknown): Promise<SourceItem[]> {
    const { repoPath, maxCount, author } = config as GitConnectorConfig;
    const git = simpleGit(repoPath);

    // Build git-log options.
    const options: Record<string, string | number | null> = {};
    if (maxCount) options['--max-count'] = maxCount;
    if (author) options['--author'] = author;

    const log: LogResult<DefaultLogFields> = await git.log(options);
    const repo = repoNameFromPath(repoPath);

    return log.all.map((c): SourceItem => {
      const subject = c.message.trim();
      const body = c.body?.trim() ?? '';
      const content = body ? `${subject}\n\n${body}` : subject;
      return {
        externalId: c.hash,
        source: 'git',
        title: subject,
        content,
        author: `${c.author_name} <${c.author_email}>`,
        createdAt: c.date,
        metadata: { repo, repoPath, hash: c.hash },
      };
    });
  },
};
