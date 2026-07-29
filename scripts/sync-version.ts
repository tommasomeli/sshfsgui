import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

interface AppInfo {
  name: string;
  slug: string;
  appId: string;
  developer: string;
  github: string;
  description: string;
  exportFormatVersion: number;
}

const pkgPath = join(root, 'package.json');
const appInfoPath = join(root, 'src/shared/app-info.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
  name: string;
  version: string;
  description: string;
  homepage?: string;
  bugs?: { url?: string };
  repository?: { url?: string };
};
const appInfo = JSON.parse(readFileSync(appInfoPath, 'utf8')) as AppInfo;
const version = pkg.version;

if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][\w.]+)?$/.test(version)) {
  console.error(`Invalid package.json version: ${version}`);
  process.exit(1);
}

// Keep npm package metadata aligned with app-info.json (version stays in package.json).
const nextPkg = {
  ...pkg,
  name: appInfo.slug,
  description: appInfo.description,
  homepage: `${appInfo.github}#readme`,
  bugs: { ...pkg.bugs, url: `${appInfo.github}/issues` },
  repository: {
    type: 'git',
    url: `git+${appInfo.github}.git`,
  },
};
if (JSON.stringify(nextPkg) !== JSON.stringify(pkg)) {
  writeFileSync(pkgPath, `${JSON.stringify(nextPkg, null, 2)}\n`);
  console.log('Synced package.json metadata from app-info.json');
}

const cargoPath = join(root, 'src-tauri', 'Cargo.toml');
const cargoToml = readFileSync(cargoPath, 'utf8');
let nextToml = cargoToml.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`);
nextToml = nextToml.replace(/^description\s*=\s*"[^"]+"/m, `description = "${appInfo.description}"`);
nextToml = nextToml.replace(/^name\s*=\s*"[^"]+"/m, `name = "${appInfo.slug}"`);
if (nextToml !== cargoToml) {
  writeFileSync(cargoPath, nextToml);
  console.log(`Synced src-tauri/Cargo.toml -> ${appInfo.slug}@${version}`);
} else
  console.log(`src-tauri/Cargo.toml already at ${appInfo.slug}@${version}`);

const lockPath = join(root, 'src-tauri', 'Cargo.lock');
const lock = readFileSync(lockPath, 'utf8');
const nextLock = lock.replace(
  /(\[\[package\]\]\nname = "sshfsgui"\n)version = "[^"]+"/,
  `$1version = "${version}"`,
);
if (nextLock !== lock) {
  writeFileSync(lockPath, nextLock);
  console.log(`Synced src-tauri/Cargo.lock -> ${version}`);
}

const tauriPath = join(root, 'src-tauri', 'tauri.conf.json');
const tauri = JSON.parse(readFileSync(tauriPath, 'utf8')) as {
  productName?: string;
  identifier?: string;
  version?: string;
  app?: { windows?: Array<{ title?: string }> };
  bundle?: { shortDescription?: string };
};
tauri.productName = appInfo.name;
tauri.identifier = appInfo.appId;
tauri.version = '../package.json';
if (tauri.app?.windows?.[0])
  tauri.app.windows[0].title = appInfo.name;
if (tauri.bundle)
  tauri.bundle.shortDescription = appInfo.description;
writeFileSync(tauriPath, `${JSON.stringify(tauri, null, 2)}\n`);
console.log('Synced src-tauri/tauri.conf.json from app-info.json');

execSync('cargo metadata --no-deps --format-version 1', {
  cwd: join(root, 'src-tauri'),
  stdio: 'ignore',
});
