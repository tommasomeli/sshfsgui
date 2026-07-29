import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';

const PROJECT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RESOURCES = join(PROJECT, 'resources');
const SUPPORTED = ['.svg', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.bmp'];
const PRIORITY = ['.svg', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.bmp'];

function findIcon(): string {
  if (!existsSync(RESOURCES)) {
    console.error(`Error: ${RESOURCES} not found`);
    process.exit(1);
  }
  const files = readdirSync(RESOURCES)
    .filter((f) => f.startsWith('icon') && SUPPORTED.includes(extname(f).toLowerCase()));
  if (files.length === 0) {
    console.error(`Error: no icon file found in ${RESOURCES}`);
    process.exit(1);
  }
  files.sort((a, b) => PRIORITY.indexOf(extname(a).toLowerCase()) - PRIORITY.indexOf(extname(b).toLowerCase()));
  return join(RESOURCES, files[0]!);
}

const iconSource = findIcon();
console.log(`==> Source: ${iconSource}`);
console.log('==> Generating src-tauri/icons via tauri icon...');
execSync(`pnpm exec tauri icon "${iconSource}"`, { cwd: PROJECT, stdio: 'inherit' });
console.log('Done! Icons written to src-tauri/icons');
