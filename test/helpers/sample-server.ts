import type { ServerConfig } from '@shared/types';

export function sampleServer(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    id: 'server-1',
    name: 'Test Server',
    host: 'example.com',
    port: 22,
    user: 'deploy',
    remotePath: '/var/www',
    localPath: '~/mnt/test',
    authMethod: 'agent',
    isFavorite: false,
    mountOnStartup: false,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}
