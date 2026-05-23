import { execSync } from 'child_process';
import { mkdirSync, cpSync, rmSync, existsSync, mkdtempSync, readdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { tmpdir } from 'os';

const PROJECT = join(dirname(new URL(import.meta.url).pathname), '..');
const RESOURCES = join(PROJECT, 'resources');
const BUILD = join(RESOURCES, 'build');

const paddingIdx = process.argv.indexOf('--padding');
const PADDING = paddingIdx !== -1 ? parseInt(process.argv[paddingIdx + 1] ?? '0', 10) : 0;

if (process.platform !== 'darwin') {
  console.log('==> Skipping icon generation (requires macOS: qlmanage, sips, iconutil)');
  process.exit(0);
}

const SUPPORTED = ['.svg', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.bmp', '.ico'];
const PRIORITY = ['.svg', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.bmp', '.ico'];

function findIcon(): string {
  if (!existsSync(RESOURCES)) { console.error(`Error: ${RESOURCES} not found`); process.exit(1); }
  const files = readdirSync(RESOURCES)
    .filter((f) => f.startsWith('icon') && SUPPORTED.includes(extname(f).toLowerCase()));
  if (files.length === 0) { console.error(`Error: no icon file found in ${RESOURCES}`); process.exit(1); }
  files.sort((a, b) => PRIORITY.indexOf(extname(a).toLowerCase()) - PRIORITY.indexOf(extname(b).toLowerCase()));
  return join(RESOURCES, files[0]);
}

function sips(size: number, input: string, output: string): void {
  execSync(`sips -z ${size} ${size} "${input}" --out "${output}"`, { stdio: 'ignore' });
}

function sipsResize(w: number, h: number, input: string, output: string): void {
  execSync(`sips --resampleHeightWidth ${h} ${w} "${input}" --out "${output}"`, { stdio: 'ignore' });
}

function padImage(input: string, output: string, targetSize: number, padding: number): void {
  const inner = targetSize - padding * 2;
  const padded = join(dirname(input), 'padded-tmp.png');
  sipsResize(inner, inner, input, padded);
  execSync(`sips --padToHeightWidth ${targetSize} ${targetSize} --padColor FFFFFF "${padded}" --out "${output}"`, { stdio: 'ignore' });
  rmSync(padded, { force: true });
}

function toPng1024(source: string, tmp: string): string {
  const ext = extname(source).toLowerCase();
  const rawPng = join(tmp, 'icon-raw.png');
  if (ext === '.svg') {
    execSync(`qlmanage -t -s 1024 -o "${tmp}" "${source}"`, { stdio: 'ignore' });
    const qlOut = join(tmp, `${source.split('/').pop()}.png`);
    sips(1024, qlOut, rawPng);
    rmSync(qlOut, { force: true });
  } else {
    cpSync(source, rawPng);
    sips(1024, rawPng, rawPng);
  }
  return rawPng;
}

const iconSource = findIcon();
console.log(`==> Source: ${iconSource}`);

const tmp = mkdtempSync(join(tmpdir(), 'sshfsgui-icons-'));
let png1024 = toPng1024(iconSource, tmp);

mkdirSync(BUILD, { recursive: true });

if (PADDING > 0) {
  console.log(`==> Padding: ${PADDING}px`);
  const paddedPng = join(tmp, 'icon-padded.png');
  padImage(png1024, paddedPng, 1024, PADDING);
  png1024 = paddedPng;
}

console.log('==> Generating icon.icns...');
mkdirSync(BUILD, { recursive: true });
const iconset = join(tmp, 'icon.iconset');
mkdirSync(iconset);

const variants: [number, string][] = [
  [16, 'icon_16x16.png'],     [32, 'icon_16x16@2x.png'],
  [32, 'icon_32x32.png'],     [64, 'icon_32x32@2x.png'],
  [128, 'icon_128x128.png'],  [256, 'icon_128x128@2x.png'],
  [256, 'icon_256x256.png'],  [512, 'icon_256x256@2x.png'],
  [512, 'icon_512x512.png'],  [1024, 'icon_512x512@2x.png'],
];

for (const [size, name] of variants)
  sips(size, png1024, join(iconset, name));

const outIcns = join(BUILD, 'icon.icns');
execSync(`iconutil -c icns "${iconset}" -o "${outIcns}"`);

rmSync(tmp, { recursive: true, force: true });

console.log(`Done! ${outIcns}`);
