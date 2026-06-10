const fs = require("fs");
const path = require("path");

const REMOVABLE_FILES = new Set([
  // Chromium third-party license dump (~19 MB), only needed for legal reference.
  "LICENSES.chromium.html",
  // SwiftShader software renderer (~16 MB). Safe to drop since this app uses no
  // WebGL/3D; Chromium only falls back to it on machines without GPU acceleration.
  "libvk_swiftshader.dylib",
  // ICD manifest that just points at the SwiftShader lib above; useless without it.
  "vk_swiftshader_icd.json",
]);

function pruneDir(dir) {
  let removedBytes = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removedBytes += pruneDir(full);
    } else if (REMOVABLE_FILES.has(entry.name)) {
      removedBytes += fs.statSync(full).size;
      fs.rmSync(full);
    }
  }
  return removedBytes;
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const removed = pruneDir(context.appOutDir);
  if (removed > 0)
    console.log(`afterPack: removed ${(removed / 1e6).toFixed(1)} MB of unused bundled files.`);
};
