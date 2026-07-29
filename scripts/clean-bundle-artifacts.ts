import { existsSync, readdirSync, rmSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const targetRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'src-tauri', 'target');

/** Remove Tauri create-dmg leftovers; keep only `.dmg` files in bundle/dmg folders. */
function cleanDmgDir(dir: string): void {
  for (const name of readdirSync(dir)) {
    if (name.endsWith('.dmg')) continue;
    const path = join(dir, name);
    rmSync(path, { recursive: true, force: true });
    console.log(`Removed ${path}`);
  }
}

function walk(dir: string): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!statSync(path).isDirectory()) continue;
    if (name === 'dmg' && dirname(path).endsWith('bundle')) {
      cleanDmgDir(path);
      continue;
    }
    walk(path);
  }
}

walk(targetRoot);
