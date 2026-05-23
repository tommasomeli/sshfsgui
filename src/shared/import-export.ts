import { EXPORT_FORMAT_KEY, EXPORT_FORMAT_VERSION } from './constants';
import type { AppSettings, ServerConfig } from './types';

export interface ExportPayload {
  _format: typeof EXPORT_FORMAT_KEY;
  _version: typeof EXPORT_FORMAT_VERSION;
  servers?: ServerConfig[];
  settings?: AppSettings;
}

export function buildExportPayload(opts: {
  servers?: ServerConfig[];
  settings?: AppSettings;
}): ExportPayload {
  const data: ExportPayload = { _format: EXPORT_FORMAT_KEY, _version: EXPORT_FORMAT_VERSION };
  if (opts.servers) data.servers = opts.servers;
  if (opts.settings) data.settings = opts.settings;
  return data;
}

export function assertValidImportPayload(data: unknown): asserts data is ExportPayload {
  if (!data || typeof data !== 'object') throw new Error('Invalid file format');
  const obj = data as Record<string, unknown>;
  if (obj._format !== EXPORT_FORMAT_KEY) throw new Error('Invalid file format');
}

export function mergeImportedServers(
  existing: ServerConfig[],
  incoming: unknown[],
  normalizePath: (p: string) => string,
): { configs: ServerConfig[]; added: number } {
  const existingIds = new Set(existing.map((c) => c.id));
  const newServers = incoming
    .filter((s): s is ServerConfig => isServerConfig(s) && !existingIds.has(s.id))
    .map((s) => ({
      ...s,
      localPath: normalizePath(s.localPath),
      identityFile: s.identityFile ? normalizePath(s.identityFile) : undefined,
    }));
  return { configs: [...existing, ...newServers], added: newServers.length };
}

export function mergeImportedSettings(current: AppSettings, incoming: unknown): AppSettings {
  if (!incoming || typeof incoming !== 'object') return current;
  return { ...current, ...(incoming as Partial<AppSettings>) };
}

function isServerConfig(value: unknown): value is ServerConfig {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return typeof s.id === 'string' && typeof s.localPath === 'string';
}
