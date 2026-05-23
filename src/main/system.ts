import { exec } from 'child_process';
import { promisify } from 'util';
import type { InstallInstructions, SystemStatus } from '@shared/types';

const execAsync = promisify(exec);

/** Resolve a command to an absolute path using the user's login environment (PATH from .zprofile / .zshrc). */
async function findCommand(cmd: string): Promise<string | null> {
  const shell = process.env['SHELL'] || '/bin/zsh';
  try {
    const { stdout } = await execAsync(`${shell} -lc 'command -v ${cmd}'`);
    const p = stdout.trim();
    return p.length ? p : null;
  } catch {
    return null;
  }
}

async function getVersion(fullPath: string): Promise<string | undefined> {
  try {
    const { stdout, stderr } = await execAsync(`"${fullPath}" --version`);
    return (stdout || stderr).trim().split('\n')[0];
  } catch {
    return undefined;
  }
}

/** True if a BOM/receipt exists for an installed .pkg (macFUSE, FUSE-T, legacy OSXFUSE). */
async function pkgutilMatches(pattern: RegExp): Promise<boolean> {
  try {
    const { stdout } = await execAsync('/usr/sbin/pkgutil --pkgs', { maxBuffer: 10 * 1024 * 1024 });
    return stdout.split('\n').some((line) => pattern.test(line.trim()));
  } catch {
    return false;
  }
}

/** macFUSE: helper on PATH (when the installer links it) or installer receipt. */
async function isMacFuseInstalled(): Promise<boolean> {
  if (await findCommand('mount_macfuse')) return true;
  return pkgutilMatches(/^io\.macfuse\.|^com\.github\.osxfuse\./);
}

/** FUSE-T: NFS helper on PATH (uncommon) or org.fuse-t.* receipts from the .pkg. */
async function isFuseTInstalled(): Promise<boolean> {
  if (await findCommand('go-nfsv4')) return true;
  return pkgutilMatches(/^org\.fuse-t\./);
}

export async function checkSystemRequirements(): Promise<SystemStatus> {
  const sshfsPath = await findCommand('sshfs');
  const sshfsVersion = sshfsPath ? await getVersion(sshfsPath) : undefined;

  return {
    sshfs: { installed: !!sshfsPath, version: sshfsVersion },
    fuseT: { installed: await isFuseTInstalled() },
    macfuse: { installed: await isMacFuseInstalled() },
  };
}

export function getInstallInstructions(): InstallInstructions {
  return {
    stacks: [
      {
        key: 'fuseT',
        commands: ['brew tap macos-fuse-t/homebrew-cask', 'brew install --cask fuse-t fuse-t-sshfs'],
      },
      {
        key: 'macfuse',
        commands: ['brew install --cask macfuse', 'brew install gromgit/fuse/sshfs-mac'],
      },
    ],
    links: [
      { label: 'FUSE-T', url: 'https://github.com/macos-fuse-t/fuse-t' },
      { label: 'macFUSE', url: 'https://macfuse.io/' },
      { label: 'Homebrew', url: 'https://brew.sh' },
    ],
  };
}
