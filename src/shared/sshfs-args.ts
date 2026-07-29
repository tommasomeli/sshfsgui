import type { ServerConfig } from './types';
import defaults from './sshfs-defaults.json';

export function buildSshfsArgs(config: ServerConfig, hasPassword: boolean): string[] {
  const args = [
    `${config.user}@${config.host}:${config.remotePath}`,
    config.localPath,
    '-p', config.port.toString(),
  ];
  for (const option of defaults.defaultOptions) {
    args.push('-o', option);
  }
  args.push('-o', `volname=${config.name}`);
  if (config.authMethod === 'key' && config.identityFile)
    args.push('-o', `IdentityFile=${config.identityFile}`);
  if (config.authMethod === 'password' && hasPassword)
    args.push('-o', 'password_stdin');
  if (config.extraOptions) {
    for (const part of config.extraOptions.split(/\s+/).filter(Boolean))
      args.push('-o', part);
  }
  return args;
}
