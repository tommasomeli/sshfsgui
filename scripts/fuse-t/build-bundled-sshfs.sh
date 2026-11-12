#!/usr/bin/env bash
# Builds sshfs against FUSE-T and stages the files that ship inside SSHFS GUI.app:
#   src-tauri/binaries/sshfs-<triple>      -> Contents/MacOS/sshfs              (Tauri externalBin)
#   src-tauri/binaries/go-nfsv4-<triple>   -> Contents/MacOS/go-nfsv4           (Tauri externalBin)
#   src-tauri/frameworks/libfuse3.4.dylib  -> Contents/Frameworks/              (bundle.macOS.frameworks)
#   src-tauri/third-party/*                -> Contents/Resources/third-party/   (licenses and sources)
#
# sshfs links libfuse3 through @rpath (@executable_path/../Frameworks) and a static glib
# built here from source for macOS 11, so the app depends only on its own files and on
# system libraries.
#
# Usage: scripts/fuse-t/build-bundled-sshfs.sh [arm64|x86_64|universal]
# Requirements: Xcode command line tools, meson, ninja (`brew install meson ninja`).
set -euo pipefail

TARGET="${1:-$(uname -m)}"
MACOS_MIN=11.0

FUSE_T_VERSION=1.2.9
FUSE_T_SHA256=a1b893740ded8ea034f1acc522ded1144f4a567a1f416daef8c1441cf2662f7f
SSHFS_COMMIT=cebbdd331199bf39b0566db236e3d47bfa27ea19
SSHFS_SHA256=16a398718194d03f890d4dec5b4c896f98abb10411cfc82dc37f8cf1d143a386
SSHFS_VERSION=3.7.5
GLIB_VERSION=2.86.5
GLIB_SHA256=ce85a947bb8b3c0204dbeff79aec39bcb46371c6fafb64ba5b8726c71e038d5f

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${WORK:-$ROOT/.cache/fuse-t}"
OUT_BIN="$ROOT/src-tauri/binaries"
OUT_FW="$ROOT/src-tauri/frameworks"
OUT_LEGAL="$ROOT/src-tauri/third-party"
mkdir -p "$WORK" "$OUT_BIN" "$OUT_FW" "$OUT_LEGAL"

for tool in meson ninja; do
  command -v "$tool" >/dev/null || { echo "$tool is required: brew install meson ninja" >&2; exit 1; }
done

triple() {
  case "$1" in
    arm64) echo aarch64-apple-darwin ;;
    x86_64) echo x86_64-apple-darwin ;;
    *) echo "unknown arch: $1" >&2; exit 1 ;;
  esac
}

fetch() { # url sha256 dest
  [[ -f "$3" ]] || curl -fsSL "$1" -o "$3"
  echo "$2  $3" | shasum -a 256 -c - >/dev/null
}

fetch "https://github.com/macos-fuse-t/fuse-t/releases/download/$FUSE_T_VERSION/fuse-t-macos-installer-$FUSE_T_VERSION.pkg" \
  "$FUSE_T_SHA256" "$WORK/fuse-t.pkg"
fetch "https://codeload.github.com/macos-fuse-t/sshfs/tar.gz/$SSHFS_COMMIT" "$SSHFS_SHA256" "$WORK/sshfs.tgz"
fetch "https://download.gnome.org/sources/glib/${GLIB_VERSION%.*}/glib-$GLIB_VERSION.tar.xz" "$GLIB_SHA256" "$WORK/glib.tar.xz"

rm -rf "$WORK/pkg" "$WORK/sshfs" "$WORK/glib"
pkgutil --expand-full "$WORK/fuse-t.pkg" "$WORK/pkg"
FT="$WORK/pkg/fuse-t-core.pkg/Payload/Library/Application Support/fuse-t"
mkdir -p "$WORK/sshfs" "$WORK/glib"
tar xzf "$WORK/sshfs.tgz" -C "$WORK/sshfs" --strip-components 1
tar xJf "$WORK/glib.tar.xz" -C "$WORK/glib" --strip-components 1

# Static glib for one architecture, isolated from Homebrew so nothing outside the app is linked.
build_glib() { # arch -> prints install prefix
  local arch=$1 prefix="$WORK/glib-$1"
  if [[ ! -f "$prefix/lib/libglib-2.0.a" ]]; then
    mkdir -p "$WORK/empty-pkgconfig"
    rm -rf "$WORK/glib-build-$arch"
    (cd "$WORK/glib" &&
      PKG_CONFIG_LIBDIR="$WORK/empty-pkgconfig" \
      CC="clang -arch $arch" CXX="clang++ -arch $arch" \
      CFLAGS="-mmacosx-version-min=$MACOS_MIN" LDFLAGS="-mmacosx-version-min=$MACOS_MIN" \
      meson setup "$WORK/glib-build-$arch" --prefix="$prefix" --libdir=lib \
        --default-library=static --buildtype=minsize \
        --force-fallback-for=pcre2,libffi,proxy-libintl \
        -Dtests=false -Dintrospection=disabled -Dnls=disabled -Dman-pages=disabled \
        -Ddocumentation=false -Dlibelf=disabled -Dsysprof=disabled -Dselinux=disabled \
        -Dxattr=false -Dlibmount=disabled -Dglib_debug=disabled >&2 &&
      meson install -C "$WORK/glib-build-$arch" >&2)
  fi
  echo "$prefix"
}

build_arch() { # arch
  local arch=$1 tr B glib
  tr="$(triple "$arch")"
  B="$WORK/build-$arch"
  rm -rf "$B" && mkdir -p "$B"
  glib="$(build_glib "$arch")"

  printf '#define PACKAGE_VERSION "%s"\n#define IDMAP_DEFAULT "user"\n' "$SSHFS_VERSION" > "$B/config.h"
  lipo "$FT/lib/libfuse3.4.dylib" -thin "$arch" -output "$B/libfuse3.4.dylib"

  local -a glib_flags
  read -r -a glib_flags <<< "$(PKG_CONFIG_LIBDIR="$glib/lib/pkgconfig" pkg-config --static --cflags --libs glib-2.0)"

  (cd "$WORK/sshfs" && clang -arch "$arch" -mmacosx-version-min="$MACOS_MIN" -Os \
    -D_REENTRANT -DHAVE_CONFIG_H -DFUSE_DARWIN_ENABLE_EXTENSIONS=0 -DFUSE_USE_VERSION=31 \
    -I"$B" -I. -Icompat -I"$FT/include/fuse3" \
    sshfs.c cache.c compat/darwin_compat.c -o "$B/sshfs" \
    -L"$B" -lfuse3 "${glib_flags[@]}" -liconv \
    -framework CoreFoundation -framework Foundation -framework AppKit \
    -Wl,-rpath,@executable_path/../Frameworks -Wl,-dead_strip)
  strip -x "$B/sshfs"

  cp "$B/sshfs" "$OUT_BIN/sshfs-$tr"
  lipo "$FT/bin/go-nfsv4-$FUSE_T_VERSION" -thin "$arch" -output "$OUT_BIN/go-nfsv4-$tr"
}

case "$TARGET" in
  arm64 | x86_64) build_arch "$TARGET" ;;
  universal)
    build_arch arm64
    build_arch x86_64
    for bin in sshfs go-nfsv4; do
      lipo -create "$OUT_BIN/$bin-aarch64-apple-darwin" "$OUT_BIN/$bin-x86_64-apple-darwin" \
        -output "$OUT_BIN/$bin-universal-apple-darwin"
    done
    ;;
  *) echo "usage: $0 [arm64|x86_64|universal]" >&2; exit 1 ;;
esac

# The library keeps both architectures so one staged copy serves every target.
cp "$FT/lib/libfuse3.4.dylib" "$OUT_FW/libfuse3.4.dylib"

textutil -convert txt -stdout "$FT/LICENSE.rtf" > "$OUT_LEGAL/FUSE-T-LICENSE.txt"
cp "$WORK/sshfs/COPYING" "$OUT_LEGAL/SSHFS-COPYING.txt"
cp "$WORK/glib/LICENSES/LGPL-2.1-or-later.txt" "$OUT_LEGAL/GLIB-LICENSE.txt"
cat > "$OUT_LEGAL/README.txt" <<EOF
SSHFS GUI includes the following third-party software.

sshfs $SSHFS_VERSION (FUSE-T fork), GNU General Public License v2 (SSHFS-COPYING.txt)
  Source: https://github.com/macos-fuse-t/sshfs/tree/$SSHFS_COMMIT
  Build script: https://github.com/tommasomeli/sshfsgui/blob/main/scripts/fuse-t/build-bundled-sshfs.sh

FUSE-T $FUSE_T_VERSION (libfuse3 and go-nfsv4), FUSE-T license (FUSE-T-LICENSE.txt)
  https://www.fuse-t.org - https://github.com/macos-fuse-t/fuse-t

GLib $GLIB_VERSION, statically linked into sshfs, GNU Lesser General Public License v2.1 (GLIB-LICENSE.txt)
  Source: https://download.gnome.org/sources/glib/${GLIB_VERSION%.*}/glib-$GLIB_VERSION.tar.xz
EOF

otool -L "$OUT_BIN"/sshfs-*
ls -l "$OUT_BIN" "$OUT_FW" "$OUT_LEGAL"
