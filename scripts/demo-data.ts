/**
 * Swaps the app data for a fixed demo set, used for screenshots and manual testing.
 *
 *   pnpm demo:seed     back up the current data, then write the demo servers
 *   pnpm demo:restore  put the backed-up data back
 *
 * Quit SSHFS GUI before running either command: the app keeps its data in memory.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appInfo = JSON.parse(readFileSync(join(root, 'src/shared/app-info.json'), 'utf8')) as { slug: string };
const dataDir = join(homedir(), 'Library', 'Application Support', appInfo.slug);
const files = ['servers.json', 'settings.json'];
const backupName = (file: string) => file.replace('.json', '.demo-backup.json');

function seed() {
  mkdirSync(dataDir, { recursive: true });
  if (files.some((file) => existsSync(join(dataDir, backupName(file))))) {
    console.error('A demo backup already exists: run `pnpm demo:restore` first.');
    process.exit(1);
  }
  for (const file of files) {
    const current = join(dataDir, file);
    if (existsSync(current)) copyFileSync(current, join(dataDir, backupName(file)));
  }

  copyFileSync(join(root, 'resources/demo/servers.json'), join(dataDir, 'servers.json'));
  const settingsPath = join(dataDir, 'settings.json');
  const settings = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, 'utf8')) : {};
  writeFileSync(settingsPath, `${JSON.stringify({ ...settings, language: 'en', launchAtLogin: false }, null, 2)}\n`);
  console.log(`Demo data written to ${dataDir}`);
}

function restore() {
  let restored = 0;
  for (const file of files) {
    const backup = join(dataDir, backupName(file));
    if (!existsSync(backup)) continue;
    copyFileSync(backup, join(dataDir, file));
    rmSync(backup);
    restored++;
  }
  console.log(restored ? `Original data restored in ${dataDir}` : 'No demo backup found.');
}

const command = process.argv[2];
if (command === 'seed') seed();
else if (command === 'restore') restore();
else {
  console.error('Usage: tsx scripts/demo-data.ts <seed|restore>');
  process.exit(1);
}
