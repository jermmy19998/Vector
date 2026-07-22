import type { SourceProvider } from "./types";

export class ProviderRegistry {
  private readonly providers = new Map<string, SourceProvider<unknown>>();

  register(provider: SourceProvider<unknown>) {
    if (this.providers.has(provider.id)) throw new Error(`Provider already registered: ${provider.id}`);
    this.providers.set(provider.id, provider);
  }

  get(id: string) {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Unknown provider: ${id}`);
    return provider;
  }

  list() { return [...this.providers.values()]; }
}

export const providerRegistry = new ProviderRegistry();
