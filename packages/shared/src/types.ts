// Common shape produced by every connector and stored by the db.
export interface SourceItem {
  externalId: string;
  source: string;
  title: string;
  content: string;
  url?: string;
  author?: string;
  createdAt?: string;
  metadata: Record<string, unknown>;
}

// Plugin contract: every data source implements this.
export interface BaseConnector {
  name: string;
  fetchItems(config: unknown): Promise<SourceItem[]>;
}
