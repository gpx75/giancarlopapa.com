import type { JobSourceProvider } from './types';
import { createJSearchProvider } from './jsearch';
import { swissdevjobsProvider } from './swissdevjobs';
import { jobschProvider } from './jobsch';

const providers = new Map<string, JobSourceProvider>();

// Register all providers
for (const p of [
  createJSearchProvider('linkedin'),
  createJSearchProvider('indeed'),
  createJSearchProvider('glassdoor'),
  swissdevjobsProvider,
  jobschProvider
]) {
  providers.set(p.name, p);
}

/** Get a provider by source name */
export function getJobProvider(name: string): JobSourceProvider | undefined {
  return providers.get(name);
}

/** List all available providers (for UI dropdowns) */
export function listJobProviders(): Array<{ name: string; label: string }> {
  return Array.from(providers.values()).map(p => ({ name: p.name, label: p.label }));
}
