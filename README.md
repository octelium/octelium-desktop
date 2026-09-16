# Octelium Desktop

The Octelium desktop application. It is a [Tauri 2](https://tauri.app) application that
implements the client side of the Octelium client daemon API
(`octelium.api.client.daemon.v1.MainService`). The desktop application builds on Linux,
macOS and Windows, with local daemon transports supported on all three platforms.

## Architecture

The application is deliberately split into three layers:

```text
Presentation                React / TypeScript
                            No credentials, no privileged access
        │
        │ Tauri IPC
        ▼
Native desktop layer        Rust / Tauri
                            gRPC transport, tray, notifications, window lifecycle
        │
        ├── local IPC ────► octelium daemon (root/SYSTEM)
        │                   credentials, authentication, Connections, DNS, routes
        │
        └── HTTP/2 + TLS ─► Octelium Cluster API
                            Services, Namespaces, Session status
```

The rule that the whole application follows is:

> Machine state belongs to the daemon. Cluster state belongs to the Cluster API.
> Presentation belongs to the WebView.

The application never reads the daemon state directory, it never sees a refresh token and
it never obtains a privileged capability of its own. Every privileged operation is a typed
RPC of the daemon API which the daemon authorizes using the kernel-derived identity of the
calling OS principal.

### The gRPC bridge

The WebView cannot open a Unix domain socket or a Windows named pipe and the daemon does
not serve gRPC-Web. The Cluster API access token must also stay out of the JavaScript heap.

The application therefore keeps the protobuf codecs in TypeScript and the transport in Rust:

```text
React
  │  new MainServiceClient(new TauriTransport({ target: "daemon" }))
  │  protobuf-ts encodes the request into bytes
  ▼
Tauri IPC          grpc_unary / grpc_server_streaming / grpc_cancel
  │
  ▼
Rust               tonic with a passthrough codec
  ├── daemon       Unix domain socket / named pipe
  └── Cluster      octelium-api.<domain>:443, x-octelium-auth injected in Rust
```

`src/utils/transport` implements the protobuf-ts `RpcTransport` interface so that the
frontend code looks exactly like the Octelium web Portal:

```ts
const { response } = await getClientUser(domain).listService(options);
const { response } = await getClientDaemon().getInfo({});
```

Server streaming (`WatchStatus`) is delivered through a Tauri channel and it is canceled
through `grpc_cancel`.

The Rust core never links any generated Octelium protobuf code. It only understands the
two messages of `GetAPICredential` so that it can fetch and cache the short-lived Cluster
access token on its own. The bridge uses an exact allowlist containing only the daemon
lifecycle/status RPCs and Cluster resource/status RPCs used by this application.
`GetAPICredential` itself is deliberately excluded from the frontend allowlist so an access
token cannot cross into the JavaScript heap.

## Repository layout

```text
scripts/gen.sh                 generates the daemon API TypeScript bindings
src/gen/client/daemonv1        the generated daemon API
src/utils/transport            the protobuf-ts transport over the Tauri IPC
src/utils/client               the daemon and user gRPC clients
src/utils/daemon               the pure helpers of the daemon state machine
src/features/daemon            the daemon status subscription and the lifecycle actions
src/features/prefs             the local application preferences
src/pages                      Connection, Services, Namespaces, Clusters, Settings, Diagnostics
src-tauri                      the Tauri application
src-tauri/crates/grpc          the gRPC bridge, testable without Tauri
```

## Requirements

* Node.js 20.19 or later, or Node.js 22.12 or later
* Rust 1.89 or later
* The platform prerequisites of Tauri 2. On Debian/Ubuntu:

```bash
sudo apt-get install libwebkit2gtk-4.1-dev libgtk-3-dev \
    libayatana-appindicator3-dev librsvg2-dev
```

* A running Octelium daemon. The native Octelium Desktop installers install it as a
  system service.
  The application connects to `/var/run/octelium/daemon.sock` on Linux and macOS and to
  `\\.\pipe\octelium-daemon` on Windows. `OCTELIUM_DAEMON_SOCKET` overrides both.

## Development

```bash
npm install
npm run tauri dev
```

```bash
npm run build      # typecheck and build the frontend
npm run test       # the frontend unit tests
npm run lint
```

```bash
cd src-tauri && cargo test
cd src-tauri && cargo fmt
```

## Regenerating the daemon API

`src/gen` is generated out of the Octelium protobuf APIs and it is committed. Regenerate it
whenever `daemonv1.proto` changes:

```bash
OCTELIUM_PB_DIR=/path/to/the/protobuf/apis npm run gen
```

`@octelium/apis` provides the Cluster APIs (`main/userv1`, `main/authv1`, `main/metav1`) so
only the daemon API is generated here.

## Building installers and test artifacts

```bash
npm run sidecar
npm run tauri build -- --config src-tauri/tauri.bundle.conf.json --config src-tauri/tauri.unsigned.conf.json
```

On Windows, use the Windows packaging overlay so the required networking DLLs are included:

```powershell
npm run sidecar
npm run tauri build -- --config src-tauri/tauri.windows.bundle.conf.json --config src-tauri/tauri.unsigned.conf.json
```

The desktop packages bundle the matching Octelium CLI as a uniquely named Tauri sidecar. The
Desktop DEB and RPM packages, macOS PKG, and Windows MSI and NSIS installers register that
sidecar as a privileged system service. The standalone Octelium CLI packages remain unchanged.
The AppImage, application bundle, DMG and raw executable are portable artifacts and do not modify
system services.

The manually triggered `build.yaml` workflow builds Linux DEB, RPM and AppImage packages,
macOS applications, DMGs and PKGs, and Windows NSIS and MSI packages for amd64 and arm64. It also
resolves the current Octelium `main` commit once, builds its CLI natively for every target,
bundles it as the daemon sidecar, and records the commit in `OCTELIUM_CLI_COMMIT`.

`octelium-cli.version` controls only local `npm run sidecar` builds. `latest` downloads the
most recent published release, and a release tag pins a local build to that version.

`release.yaml` runs for semantic `v*.*.*` tags, verifies that the npm, Cargo and Tauri versions
match the tag, bundles the latest published Octelium CLI binaries after checksum verification,
builds the same target matrix, generates checksums and provenance, and creates a draft GitHub
release. Both workflows build a lower-version installer baseline and run `installer-test.yaml` before
completion. The tests install the baseline, upgrade to the candidate, verify the privileged service
and uninstall every managed package format on amd64 and arm64.

The macOS PKG can be removed with:

```bash
sudo "/Library/Application Support/Octelium Desktop/uninstall.sh"
```

The macOS application uses ad-hoc signing and the PKG remains unsigned until production signing
identities are configured.

## License

Apache License 2.0. See [LICENSE](LICENSE).
