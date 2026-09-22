#!/bin/bash
set -euo pipefail

APP_PATH="$1"
VERSION="$2"
ARCH="$3"
OUTPUT_PATH="$4"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
IDENTIFIER="com.octelium.desktop"
SUPPORT_DIR="Library/Application Support/Octelium Desktop"

MIN_OS="$(sed -n 's/.*"minimumSystemVersion"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
    "$REPO_ROOT/src-tauri/tauri.conf.json" | head -n 1)"
if [[ -z "$MIN_OS" ]]; then
    printf '%s\n' "Could not read minimumSystemVersion from tauri.conf.json" >&2
    exit 1
fi

ROOT_DIR="$(mktemp -d)"
SCRIPTS_DIR="$(mktemp -d)"
BUILD_DIR="$(mktemp -d)"
COMPONENT_PLIST="$BUILD_DIR/component.plist"
DISTRIBUTION="$BUILD_DIR/distribution.xml"
trap 'rm -rf "$ROOT_DIR" "$SCRIPTS_DIR" "$BUILD_DIR"' EXIT

mkdir -p "$ROOT_DIR/Applications" "$ROOT_DIR/Library/LaunchDaemons" "$ROOT_DIR/$SUPPORT_DIR"
ditto "$APP_PATH" "$ROOT_DIR/Applications/Octelium Desktop.app"
cp "$SCRIPT_DIR/com.octelium.desktop.daemon.plist" "$ROOT_DIR/Library/LaunchDaemons/"
cp "$SCRIPT_DIR/uninstall.sh" "$ROOT_DIR/$SUPPORT_DIR/uninstall.sh"
chmod 644 "$ROOT_DIR/Library/LaunchDaemons/com.octelium.desktop.daemon.plist"
chmod 755 "$ROOT_DIR/$SUPPORT_DIR/uninstall.sh"

pkgbuild --analyze --root "$ROOT_DIR" "$COMPONENT_PLIST"

bundle_index=0
while /usr/libexec/PlistBuddy -c "Print :${bundle_index}:BundleIsRelocatable" \
    "$COMPONENT_PLIST" >/dev/null 2>&1; do
    /usr/libexec/PlistBuddy -c "Set :${bundle_index}:BundleIsRelocatable false" "$COMPONENT_PLIST"
    bundle_index=$((bundle_index + 1))
done
if [[ "$bundle_index" -eq 0 ]]; then
    printf '%s\n' "pkgbuild did not find any bundle in the payload" >&2
    exit 1
fi

tee "$SCRIPTS_DIR/preinstall" >/dev/null <<'SCRIPT'
#!/bin/bash
set -e

label="com.octelium.desktop.daemon"

launchctl bootout "system/$label" 2>/dev/null || true

attempt=1
while [ "$attempt" -le 60 ]; do
    if ! launchctl print "system/$label" >/dev/null 2>&1; then
        break
    fi
    attempt=$((attempt + 1))
    sleep 0.5
done

exit 0
SCRIPT

tee "$SCRIPTS_DIR/postinstall" >/dev/null <<'SCRIPT'
#!/bin/bash
set -e

label="com.octelium.desktop.daemon"
plist="/Library/LaunchDaemons/com.octelium.desktop.daemon.plist"
daemon="/Applications/Octelium Desktop.app/Contents/MacOS/octelium-desktop-daemon"

if [ ! -x "$daemon" ]; then
    printf '%s\n' "The Octelium Desktop daemon executable is missing" >&2
    exit 1
fi

chown root:wheel "$plist"
chmod 644 "$plist"

launchctl enable "system/$label" 2>/dev/null || true

attempt=1
while [ "$attempt" -le 30 ]; do
    if launchctl print "system/$label" >/dev/null 2>&1; then
        break
    fi
    if launchctl bootstrap system "$plist" 2>/dev/null; then
        break
    fi
    attempt=$((attempt + 1))
    sleep 1
done

if ! launchctl print "system/$label" >/dev/null 2>&1; then
    launchctl bootstrap system "$plist"
fi

launchctl kickstart -k "system/$label"

exit 0
SCRIPT

chmod 755 "$SCRIPTS_DIR/preinstall" "$SCRIPTS_DIR/postinstall"

pkgbuild \
    --root "$ROOT_DIR" \
    --scripts "$SCRIPTS_DIR" \
    --component-plist "$COMPONENT_PLIST" \
    --identifier "$IDENTIFIER" \
    --version "$VERSION" \
    --ownership recommended \
    "$BUILD_DIR/component.pkg"

cat > "$DISTRIBUTION" <<DIST
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="2">
    <title>Octelium Desktop</title>
    <domains enable_anywhere="false" enable_currentUserHome="false" enable_localSystem="true"/>
    <options customize="never" hostArchitectures="x86_64,arm64"/>
    <allowed-os-versions>
        <os-version min="${MIN_OS}"/>
    </allowed-os-versions>
    <choices-outline>
        <line choice="default"/>
    </choices-outline>
    <choice id="default" visible="false">
        <pkg-ref id="${IDENTIFIER}"/>
    </choice>
    <pkg-ref id="${IDENTIFIER}" version="${VERSION}" onConclusion="none">component.pkg</pkg-ref>
</installer-gui-script>
DIST

mkdir -p "$(dirname "$OUTPUT_PATH")"
productbuild \
    --distribution "$DISTRIBUTION" \
    --package-path "$BUILD_DIR" \
    "$OUTPUT_PATH"

printf '%s\n' "Created Octelium ${VERSION} ${ARCH} package at ${OUTPUT_PATH}"
