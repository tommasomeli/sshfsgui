#!/usr/bin/env bash
# Builds sshfs against FUSE-T and stages the files that ship inside SSHFS GUI.app:
#   src-tauri/binaries/sshfs-<triple>      -> Contents/MacOS/sshfs      (Tauri externalBin)
#   src-tauri/binaries/go-nfsv4-<triple>   -> Contents/MacOS/go-nfsv4   (Tauri externalBin)
#   src-tauri/frameworks/libfuse3.4.dylib  -> Contents/Frameworks/      (bundle.macOS.frameworks)
#
# sshfs links libfuse3 through @rpath (@executable_path/../Frameworks) and glib statically,
# so the app depends only on its own files and on system libraries.
#
# Usage: scripts/fuse-t/build-bundled-sshfs.sh [arm64|x86_64]
# Requirements: Xcode command line tools, pkg-config, a static glib for the target arch
# (GLIB_PREFIX, default: Homebrew prefix of the matching arch).
set -euo pipefail

ARCH="${1:-arm64}"
case "$ARCH" in
  arm64) TRIPLE=aarch64-apple-darwin; DEFAULT_GLIB=/opt/homebrew ;;
  x86_64) TRIPLE=x86_64-apple-darwin; DEFAULT_GLIB=/usr/local ;;
  *) echo "unknown arch: $ARCH" >&2; exit 1 ;;
esac
GLIB_PREFIX="${GLIB_PREFIX:-$DEFAULT_GLIB}"

FUSE_T_VERSION=1.2.9
FUSE_T_SHA256=a1b893740ded8ea034f1acc522ded1144f4a567a1f416daef8c1441cf2662f7f
SSHFS_COMMIT=cebbdd331199bf39b0566db236e3d47bfa27ea19
SSHFS_SHA256=16a398718194d03f890d4dec5b4c896f98abb10411cfc82dc37f8cf1d143a386
SSHFS_VERSION=3.7.5

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${WORK:-$ROOT/.cache/fuse-t}"
OUT_BIN="$ROOT/src-tauri/binaries"
OUT_FW="$ROOT/src-tauri/frameworks"
mkdir -p "$WORK" "$OUT_BIN" "$OUT_FW"

fetch() { # url sha256 dest
  [[ -f "$3" ]] || curl -fsSL "$1" -o "$3"
  echo "$2  $3" | shasum -a 256 -c - >/dev/null
}

fetch "https://github.com/macos-fuse-t/fuse-t/releases/download/$FUSE_T_VERSION/fuse-t-macos-installer-$FUSE_T_VERSION.pkg" \
  "$FUSE_T_SHA256" "$WORK/fuse-t.pkg"
fetch "https://codeload.github.com/macos-fuse-t/sshfs/tar.gz/$SSHFS_COMMIT" "$SSHFS_SHA256" "$WORK/sshfs.tgz"

rm -rf "$WORK/pkg" "$WORK/sshfs" "$WORK/build-$ARCH"
pkgutil --expand-full "$WORK/fuse-t.pkg" "$WORK/pkg"
FT="$WORK/pkg/fuse-t-core.pkg/Payload/Library/Application Support/fuse-t"
mkdir -p "$WORK/sshfs" "$WORK/build-$ARCH"
tar xzf "$WORK/sshfs.tgz" -C "$WORK/sshfs" --strip-components 1

B="$WORK/build-$ARCH"
printf '#define PACKAGE_VERSION "%s"\n#define IDMAP_DEFAULT "user"\n' "$SSHFS_VERSION" > "$B/config.h"
lipo "$FT/lib/libfuse3.4.dylib" -thin "$ARCH" -output "$B/libfuse3.4.dylib"

GLIB_CFLAGS=(-I"$GLIB_PREFIX/opt/glib/include/glib-2.0" -I"$GLIB_PREFIX/opt/glib/lib/glib-2.0/include" -I"$GLIB_PREFIX/opt/gettext/include")
GLIB_LIBS=("$GLIB_PREFIX/lib/libglib-2.0.a" "$GLIB_PREFIX/lib/libintl.a" "$GLIB_PREFIX/lib/libpcre2-8.a"
  -liconv -framework CoreFoundation -framework Foundation -framework AppKit)

(cd "$WORK/sshfs" && clang -arch "$ARCH" -mmacosx-version-min=11.0 -Os \
  -D_REENTRANT -DHAVE_CONFIG_H -DFUSE_DARWIN_ENABLE_EXTENSIONS=0 -DFUSE_USE_VERSION=31 \
  -I"$B" -I. -Icompat -I"$FT/include/fuse3" "${GLIB_CFLAGS[@]}" \
  sshfs.c cache.c compat/darwin_compat.c -o "$B/sshfs" \
  -L"$B" -lfuse3 "${GLIB_LIBS[@]}" \
  -Wl,-rpath,@executable_path/../Frameworks -Wl,-dead_strip)
strip -x "$B/sshfs"

cp "$B/sshfs" "$OUT_BIN/sshfs-$TRIPLE"
lipo "$FT/bin/go-nfsv4-$FUSE_T_VERSION" -thin "$ARCH" -output "$OUT_BIN/go-nfsv4-$TRIPLE"
cp "$B/libfuse3.4.dylib" "$OUT_FW/libfuse3.4.dylib"

otool -L "$OUT_BIN/sshfs-$TRIPLE"
ls -l "$OUT_BIN" "$OUT_FW"
