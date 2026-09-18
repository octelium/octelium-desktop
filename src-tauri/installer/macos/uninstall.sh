#!/bin/bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
    printf '%s\n' "Octelium Desktop must be uninstalled as root" >&2
    exit 1
fi

label="com.octelium.desktop.daemon"
plist="/Library/LaunchDaemons/com.octelium.desktop.daemon.plist"
support_dir="/Library/Application Support/Octelium Desktop"
log="/var/log/octelium-desktop-daemon.log"

launchctl bootout "system/$label" 2>/dev/null || true

attempt=1
while [[ "$attempt" -le 60 ]]; do
    if ! launchctl print "system/$label" >/dev/null 2>&1; then
        break
    fi
    attempt=$((attempt + 1))
    sleep 0.5
done

rm -f "$plist"
rm -rf "/Applications/Octelium Desktop.app"
pkgutil --forget com.octelium.desktop >/dev/null 2>&1 || true
rm -rf "$support_dir"
rm -f "$log"
