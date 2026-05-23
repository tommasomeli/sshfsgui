import * as os from 'os';
import * as path from 'path';

export function expandHome(p: string): string {
  if (p.startsWith('~/') || p === '~') return path.join(os.homedir(), p.slice(1));
  return p;
}

/** Store paths under the user home as ~/... */
export function collapseHome(p: string): string {
  const expanded = path.resolve(expandHome(p.trim()));
  const home = os.homedir();
  if (expanded === home) return '~';
  const prefix = home + path.sep;
  if (expanded.startsWith(prefix)) return '~' + expanded.slice(home.length);
  return expanded;
}
