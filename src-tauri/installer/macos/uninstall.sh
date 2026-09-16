#!/bin/bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
    printf '%s\n' "Octelium Desktop must be uninstalled as root" >&2
    exit 1
fi

label="com.octelium.desktop.daemon"
plist="/Library/LaunchDaemons/com.octelium.desktop.daemon.plist"
support_dir="/Library/Application Support/Octelium Desktop"

if launchctl print "system/$label" >/dev/null 2>&1; then
    launchctl bootout "system/$label"
fi

rm -f "$plist"
rm -rf "/Applications/Octelium Desktop.app"
pkgutil --forget com.octelium.desktop >/dev/null 2>&1 || true
rm -rf "$support_dir"
