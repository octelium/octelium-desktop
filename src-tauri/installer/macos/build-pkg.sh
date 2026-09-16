#!/bin/bash
set -euo pipefail

APP_PATH="$1"
VERSION="$2"
ARCH="$3"
OUTPUT_PATH="$4"
ROOT_DIR="$(mktemp -d)"
SCRIPTS_DIR="$(mktemp -d)"
COMPONENT_PLIST="${ROOT_DIR}.plist"
trap 'rm -rf "$ROOT_DIR" "$SCRIPTS_DIR"; rm -f "$COMPONENT_PLIST"' EXIT

mkdir -p "$ROOT_DIR/Applications" "$ROOT_DIR/Library/LaunchDaemons" \
    "$ROOT_DIR/Library/Application Support/Octelium Desktop"
ditto "$APP_PATH" "$ROOT_DIR/Applications/Octelium Desktop.app"
cp src-tauri/installer/macos/com.octelium.desktop.daemon.plist "$ROOT_DIR/Library/LaunchDaemons/"
cp src-tauri/installer/macos/uninstall.sh \
    "$ROOT_DIR/Library/Application Support/Octelium Desktop/uninstall.sh"
chmod 644 "$ROOT_DIR/Library/LaunchDaemons/com.octelium.desktop.daemon.plist"
chmod 755 "$ROOT_DIR/Library/Application Support/Octelium Desktop/uninstall.sh"
pkgbuild --analyze --root "$ROOT_DIR" "$COMPONENT_PLIST"
/usr/libexec/PlistBuddy -c "Set :0:BundleIsRelocatable false" "$COMPONENT_PLIST"

tee "$SCRIPTS_DIR/preinstall" >/dev/null <<'SCRIPT'
#!/bin/bash
set -e

if launchctl print system/com.octelium.desktop.daemon >/dev/null 2>&1; then
    launchctl bootout system/com.octelium.desktop.daemon
fi

exit 0
SCRIPT

tee "$SCRIPTS_DIR/postinstall" >/dev/null <<'SCRIPT'
#!/bin/bash
set -e

launchctl bootstrap system /Library/LaunchDaemons/com.octelium.desktop.daemon.plist
launchctl enable system/com.octelium.desktop.daemon
launchctl kickstart -k system/com.octelium.desktop.daemon

exit 0
SCRIPT
chmod 755 "$SCRIPTS_DIR/preinstall" "$SCRIPTS_DIR/postinstall"
mkdir -p "$(dirname "$OUTPUT_PATH")"
pkgbuild \
    --root "$ROOT_DIR" \
    --scripts "$SCRIPTS_DIR" \
    --component-plist "$COMPONENT_PLIST" \
    --identifier com.octelium.desktop \
    --version "$VERSION" \
    --ownership recommended \
    "$OUTPUT_PATH"
printf '%s\n' "Created Octelium ${VERSION} ${ARCH} package at ${OUTPUT_PATH}"
