#!/bin/bash
set -euo pipefail

DEB_PATH="$1"
VERSION="$2"
ARCH="$3"
OUTPUT_PATH="$4"

case "$ARCH" in
    x86_64|aarch64) ;;
    *)
        printf '%s\n' "Unsupported Arch Linux architecture: $ARCH" >&2
        exit 1
        ;;
esac

for command_name in bsdtar zstd; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
        printf '%s\n' "Required command is not installed: $command_name" >&2
        exit 1
    fi
done

ROOT_DIR="$(mktemp -d)"
DEB_DIR="$(mktemp -d)"
LIST_PATH="$(mktemp)"
INFO_PATH="$(mktemp)"
trap 'rm -rf "$ROOT_DIR" "$DEB_DIR" "$LIST_PATH" "$INFO_PATH"' EXIT

bsdtar -xf "$DEB_PATH" -C "$DEB_DIR"
DATA_ARCHIVE="$(find "$DEB_DIR" -type f -name 'data.tar.*' -print -quit)"
test -n "$DATA_ARCHIVE"
bsdtar -xf "$DATA_ARCHIVE" -C "$ROOT_DIR"

test -x "$ROOT_DIR/usr/bin/octelium-desktop"
test -x "$ROOT_DIR/usr/bin/octelium-desktop-daemon"
test -f "$ROOT_DIR/usr/lib/systemd/system/octelium-desktop-daemon.service"

cat > "$ROOT_DIR/.INSTALL" <<'SCRIPT'
post_install() {
    if [ -d /run/systemd/system ]; then
        systemctl daemon-reload
        systemctl enable octelium-desktop-daemon.service
        systemctl restart octelium-desktop-daemon.service
    fi
}

post_upgrade() {
    post_install "$1"
}

pre_remove() {
    if [ -d /run/systemd/system ]; then
        systemctl disable --now octelium-desktop-daemon.service
    fi
}

post_remove() {
    rm -rf /var/lib/octelium-desktop
    if [ -d /run/systemd/system ]; then
        systemctl daemon-reload
    fi
}
SCRIPT

BUILD_DATE="${SOURCE_DATE_EPOCH:-$(date +%s)}"
PACKAGE_SIZE="$(du -sb "$ROOT_DIR/usr" | cut -f1)"
SCRIPT_HASH="$(sha256sum "$0" | cut -d ' ' -f1)"

cat > "$ROOT_DIR/.PKGINFO" <<EOF
pkgname = octelium-desktop
pkgbase = octelium-desktop
pkgver = ${VERSION}-1
pkgdesc = The Octelium desktop application
url = https://github.com/octelium/octelium-desktop
builddate = ${BUILD_DATE}
packager = Octelium Labs, LLC
size = ${PACKAGE_SIZE}
arch = ${ARCH}
license = Apache-2.0
depend = glibc
depend = gtk3
depend = webkit2gtk-4.1
depend = libayatana-appindicator
depend = systemd
EOF

cat > "$ROOT_DIR/.BUILDINFO" <<EOF
format = 2
pkgname = octelium-desktop
pkgbase = octelium-desktop
pkgver = ${VERSION}-1
pkgarch = ${ARCH}
pkgbuild_sha256sum = ${SCRIPT_HASH}
packager = Octelium Labs, LLC
builddate = ${BUILD_DATE}
builddir = /build
startdir = /build
buildtool = octelium-release
buildtoolver = ${VERSION}-1-${ARCH}
buildenv = !distcc
buildenv = color
buildenv = !ccache
buildenv = check
buildenv = !sign
options = strip
options = docs
options = libtool
options = staticlibs
options = emptydirs
options = zipman
options = purge
options = debug
options = lto
EOF

bsdtar -czf "$ROOT_DIR/.MTREE" \
    --format=mtree \
    --options='!all,use-set,type,uid,gid,mode,time,size,md5,sha256,link' \
    --uid 0 \
    --gid 0 \
    --uname root \
    --gname root \
    -C "$ROOT_DIR" \
    .PKGINFO .BUILDINFO .INSTALL usr

mkdir -p "$(dirname "$OUTPUT_PATH")"
bsdtar --zstd -cf "$OUTPUT_PATH" \
    --uid 0 \
    --gid 0 \
    --uname root \
    --gname root \
    -C "$ROOT_DIR" \
    .PKGINFO .BUILDINFO .MTREE .INSTALL usr

bsdtar -tf "$OUTPUT_PATH" > "$LIST_PATH"
for required_path in \
    .PKGINFO \
    .BUILDINFO \
    .MTREE \
    .INSTALL \
    usr/bin/octelium-desktop \
    usr/bin/octelium-desktop-daemon \
    usr/lib/systemd/system/octelium-desktop-daemon.service; do
    grep -Fxq "$required_path" "$LIST_PATH"
done

bsdtar -xOf "$OUTPUT_PATH" .PKGINFO > "$INFO_PATH"
grep -Fxq "pkgname = octelium-desktop" "$INFO_PATH"
grep -Fxq "pkgver = ${VERSION}-1" "$INFO_PATH"
grep -Fxq "arch = ${ARCH}" "$INFO_PATH"

printf '%s\n' "Created Octelium ${VERSION} ${ARCH} package at $OUTPUT_PATH"
