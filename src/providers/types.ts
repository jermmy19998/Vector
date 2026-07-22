/** Stable normalized contract every internet source provider implements. */
export interface SourceProvider<TConfig = Record<string, unknown>> {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  validate(config: TConfig): Promise<ValidationResult>;
  fetch(context: FetchContext<TConfig>): AsyncIterable<NormalizedItem>;
  healthCheck(): Promise<ProviderHealth>;
}

export type FetchContext<TConfig> = {
  config: TConfig;
  cursor?: string;
  since: Date;
  signal: AbortSignal;
};

export type NormalizedItem = {
  externalId: string;
  title: string;
  url: string;
  publishedAt: Date;
  authors: string[];
  tags: string[];
  content?: string;
  githubUrl?: string;
  language?: string;
  raw: unknown;
};

export type ValidationResult = { valid: true } | { valid: false; errors: string[] };
export type ProviderHealth = { healthy: boolean; latencyMs: number; message?: string };
