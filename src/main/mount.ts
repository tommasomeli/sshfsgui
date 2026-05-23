import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import type { ServerConfig } from '@shared/types';
import { expandHome } from '@shared/paths';
import { buildSshfsArgs } from '@shared/sshfs-args';
import { getPassword } from './storage';

const execAsync = promisify(exec);

export { expandHome, collapseHome } from '@shared/paths';

let resolvedSshfsPath: string | null = null;

async function getSshfsPath(): Promise<string> {
  if (resolvedSshfsPath) return resolvedSshfsPath;
  const shell = process.env['SHELL'] || '/bin/zsh';
  try {
    const { stdout } = await execAsync(`${shell} -lc 'which sshfs'`);
    const p = stdout.trim();
    if (p.length) { resolvedSshfsPath = p; return p; }
  } catch { /* fall through */ }
  throw new Error('sshfs not found. Install it via Homebrew or add it to your PATH.');
}

export async function isMounted(localPath: string): Promise<boolean> {
  const resolved = expandHome(localPath);
  try {
    const { stdout } = await execAsync('/sbin/mount');
    return stdout.split('\n').some((line) => line.includes(` on ${resolved} (`));
  } catch {
    return false;
  }
}

export async function mountServer(config: ServerConfig): Promise<void> {
  const localPath = expandHome(config.localPath);
  const forSshfs: ServerConfig = config.identityFile
    ? { ...config, localPath, identityFile: expandHome(config.identityFile) }
    : { ...config, localPath };

  if (!fs.existsSync(localPath)) {
    try {
      fs.mkdirSync(localPath, { recursive: true });
    } catch {
      throw new Error(`Failed to create mount point: ${localPath}`);
    }
  }

  if (await isMounted(config.localPath))
    throw new Error(`Mount point ${localPath} is already in use.`);

  const sshfsPath = await getSshfsPath();
  const password = config.authMethod === 'password' ? await getPassword(config.id) : null;
  const args = buildSshfsArgs(forSshfs, !!password);

  return new Promise((resolve, reject) => {
    const child = spawn(sshfsPath, args);
    if (password) {
      child.stdin.write(password + '\n');
      child.stdin.end();
    }
    let stderr = '';
    child.stderr.on('data', (data) => (stderr += data.toString()));
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `sshfs exited with code ${code}`));
    });
  });
}

export async function unmountServer(localPath: string): Promise<void> {
  const resolved = expandHome(localPath);
  return new Promise((resolve, reject) => {
    const child = spawn('/sbin/umount', [resolved]);
    child.on('close', (code) => {
      if (code === 0) return resolve();
      const fallback = spawn('/usr/sbin/diskutil', ['unmount', 'force', resolved]);
      let stderr = '';
      fallback.stderr.on('data', (d) => (stderr += d.toString()));
      fallback.on('close', (code2) => {
        if (code2 === 0) resolve();
        else reject(new Error(stderr.trim() || `Failed to unmount ${resolved}`));
      });
    });
  });
}
