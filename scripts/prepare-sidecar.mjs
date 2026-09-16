import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { access, chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { URL } from "node:url";

const targets = {
  "x86_64-unknown-linux-gnu": { os: "linux", arch: "amd64", extension: "" },
  "aarch64-unknown-linux-gnu": { os: "linux", arch: "arm64", extension: "" },
  "x86_64-apple-darwin": { os: "darwin", arch: "amd64", extension: "" },
  "aarch64-apple-darwin": { os: "darwin", arch: "arm64", extension: "" },
  "x86_64-pc-windows-msvc": { os: "windows", arch: "amd64", extension: ".exe" },
  "aarch64-pc-windows-msvc": { os: "windows", arch: "arm64", extension: ".exe" },
};

const hostTargets = {
  "linux:x64": "x86_64-unknown-linux-gnu",
  "linux:arm64": "aarch64-unknown-linux-gnu",
  "darwin:x64": "x86_64-apple-darwin",
  "darwin:arm64": "aarch64-apple-darwin",
  "win32:x64": "x86_64-pc-windows-msvc",
  "win32:arm64": "aarch64-pc-windows-msvc",
};

const targetIndex = process.argv.indexOf("--target");
const target = targetIndex === -1
  ? hostTargets[`${process.platform}:${process.arch}`]
  : process.argv[targetIndex + 1];
const platform = targets[target];

if (!platform) {
  throw new Error(`Unsupported target: ${target ?? `${process.platform}:${process.arch}`}`);
}

const requestHeaders = { "User-Agent": "octelium-desktop-sidecar" };
if (process.env.GITHUB_TOKEN) {
  requestHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

let tag = process.env.OCTELIUM_VERSION
  ?? (await readFile(new URL("../octelium-cli.version", import.meta.url), "utf8")).trim();

if (!tag || tag === "latest") {
  const response = await globalThis.fetch("https://api.github.com/repos/octelium/octelium/releases/latest", {
    headers: requestHeaders,
  });
  if (!response.ok) {
    throw new Error(`Could not resolve the latest Octelium release: ${response.status}`);
  }
  tag = (await response.json()).tag_name;
}

if (!/^[A-Za-z0-9._-]+$/.test(tag)) {
  throw new Error(`Invalid Octelium release tag: ${tag}`);
}

const archiveExtension = platform.os === "windows" ? "zip" : "tar.gz";
const archiveName = `octelium-${platform.os}-${platform.arch}.${archiveExtension}`;
const checksumName = "SHA256SUMS";
const outputDir = resolve("src-tauri/binaries");
const sidecarPath = join(outputDir, `octelium-desktop-daemon-${target}${platform.extension}`);
const versionPath = join(outputDir, `octelium-desktop-daemon-${target}.version`);

await mkdir(outputDir, { recursive: true });

try {
  const currentVersion = (await readFile(versionPath, "utf8")).trim();
  await access(sidecarPath);
  if (platform.os === "windows") {
    await Promise.all(["wireguard.dll", "wintun.dll"].map((name) => access(join(outputDir, name))));
  }
  if (currentVersion === tag) {
    process.stdout.write(`Octelium ${tag} is already prepared for ${target}\n`);
    process.exit(0);
  }
} catch (error) {
  if (!error || typeof error !== "object" || error.code !== "ENOENT") {
    throw error;
  }
}

const temporaryDir = await mkdtemp(join(tmpdir(), "octelium-sidecar-"));

try {
  const archivePath = join(temporaryDir, archiveName);
  const checksumPath = join(temporaryDir, checksumName);
  const releaseBase = `https://github.com/octelium/octelium/releases/download/${tag}`;

  for (const [url, path] of [
    [`${releaseBase}/${archiveName}`, archivePath],
    [`${releaseBase}/${checksumName}`, checksumPath],
  ]) {
    const response = await globalThis.fetch(url, { headers: requestHeaders, redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Could not download ${url}: ${response.status}`);
    }
    await writeFile(path, Buffer.from(await response.arrayBuffer()));
  }

  const checksumLines = (await readFile(checksumPath, "utf8")).split(/\r?\n/);
  const checksumLine = checksumLines.find((line) => line.trim().endsWith(`  ${archiveName}`));
  const expectedChecksum = checksumLine?.trim().split(/\s+/)[0]?.toLowerCase();
  const actualChecksum = createHash("sha256")
    .update(await readFile(archivePath))
    .digest("hex");

  if (!expectedChecksum || expectedChecksum !== actualChecksum) {
    throw new Error(`SHA-256 verification failed for ${archiveName}`);
  }

  const extractedDir = join(temporaryDir, "extracted");
  await mkdir(extractedDir);
  const extraction = spawnSync("tar", ["-xf", archivePath, "-C", extractedDir], {
    encoding: "utf8",
  });
  if (extraction.status !== 0) {
    throw new Error(extraction.stderr || `Could not extract ${archiveName}`);
  }

  await copyFile(join(extractedDir, `octelium${platform.extension}`), sidecarPath);
  if (platform.os !== "windows") {
    await chmod(sidecarPath, 0o755);
  }
  if (platform.os === "windows") {
    await copyFile(join(extractedDir, "wireguard.dll"), join(outputDir, "wireguard.dll"));
    await copyFile(join(extractedDir, "wintun.dll"), join(outputDir, "wintun.dll"));
  }
  await writeFile(versionPath, `${tag}\n`);
  process.stdout.write(`Prepared Octelium ${tag} for ${target}\n`);
} finally {
  await rm(temporaryDir, { recursive: true, force: true });
}
