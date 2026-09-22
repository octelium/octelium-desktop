import { execFileSync, spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const versionFiles = [
  "package.json",
  "package-lock.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
];

function git(args, options = {}) {
  return execFileSync("git", args, { encoding: "utf8", stdio: "pipe", ...options }).trim();
}

function replaceVersion(contents, pattern, version, path) {
  if (!pattern.test(contents)) {
    throw new Error(`Could not find the version in ${path}`);
  }
  return contents.replace(pattern, `$1${version}$2`);
}

function readCargoVersion(contents, pattern, path) {
  const match = contents.match(pattern);
  if (!match) {
    throw new Error(`Could not find the version in ${path}`);
  }
  return match[1];
}

function nextVersion(version, release) {
  const [major, minor, patch] = version.split(".").map(BigInt);
  if (release === "major") {
    return `${major + 1n}.0.0`;
  }
  if (release === "minor") {
    return `${major}.${minor + 1n}.0`;
  }
  return `${major}.${minor}.${patch + 1n}`;
}

function isGreaterVersion(version, currentVersion) {
  const next = version.split(".").map(BigInt);
  const current = currentVersion.split(".").map(BigInt);
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] !== current[index]) {
      return next[index] > current[index];
    }
  }
  return false;
}

const requestedVersion = process.argv[2];
if (!requestedVersion) {
  throw new Error("Usage: make release VERSION=x.y.z");
}

const status = git(["status", "--porcelain"]);
if (status) {
  throw new Error("The worktree must be clean before creating a release");
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
const tauriConfig = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8"));
const cargoToml = await readFile("src-tauri/Cargo.toml", "utf8");
const cargoLock = await readFile("src-tauri/Cargo.lock", "utf8");
const cargoTomlPattern = /(\[package\][\s\S]*?\nversion = ")[^"]+(")/;
const cargoLockPattern = /(\[\[package\]\]\nname = "octelium-desktop"\nversion = ")[^"]+(")/;
const currentVersions = new Set([
  packageJson.version,
  packageLock.version,
  packageLock.packages?.[""]?.version,
  tauriConfig.version,
  readCargoVersion(cargoToml, /\[package\][\s\S]*?\nversion = "([^"]+)"/, "src-tauri/Cargo.toml"),
  readCargoVersion(cargoLock, /\[\[package\]\]\nname = "octelium-desktop"\nversion = "([^"]+)"/, "src-tauri/Cargo.lock"),
]);

if (currentVersions.size !== 1) {
  throw new Error(`Project versions do not match: ${[...currentVersions].join(", ")}`);
}

const currentVersion = [...currentVersions][0];
if (!versionPattern.test(currentVersion)) {
  throw new Error(`Current version is not a stable SemVer: ${currentVersion}`);
}

const version = ["major", "minor", "patch"].includes(requestedVersion)
  ? nextVersion(currentVersion, requestedVersion)
  : requestedVersion;

if (!versionPattern.test(version)) {
  throw new Error(`Invalid stable SemVer: ${version}`);
}
if (version === currentVersion) {
  throw new Error(`Version is already ${version}`);
}
if (!isGreaterVersion(version, currentVersion)) {
  throw new Error(`Version ${version} must be greater than ${currentVersion}`);
}

const tag = `v${version}`;
const tagExists = spawnSync("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`]);
if (tagExists.status === 0) {
  throw new Error(`Tag already exists: ${tag}`);
}
if (tagExists.status !== 1) {
  throw new Error(`Could not check whether ${tag} exists`);
}

packageJson.version = version;
packageLock.version = version;
packageLock.packages[""].version = version;
tauriConfig.version = version;

await Promise.all([
  writeFile("package.json", `${JSON.stringify(packageJson, null, 2)}\n`),
  writeFile("package-lock.json", `${JSON.stringify(packageLock, null, 2)}\n`),
  writeFile("src-tauri/tauri.conf.json", `${JSON.stringify(tauriConfig, null, 2)}\n`),
  writeFile(
    "src-tauri/Cargo.toml",
    replaceVersion(cargoToml, cargoTomlPattern, version, "src-tauri/Cargo.toml"),
  ),
  writeFile(
    "src-tauri/Cargo.lock",
    replaceVersion(cargoLock, cargoLockPattern, version, "src-tauri/Cargo.lock"),
  ),
]);

git(["add", "--", ...versionFiles]);
execFileSync("git", ["diff", "--cached", "--check"], { stdio: "inherit" });
execFileSync("git", ["commit", "-m", `chore: release ${tag}`], { stdio: "inherit" });
execFileSync("git", ["tag", "-a", tag, "-m", tag], { stdio: "inherit" });
process.stdout.write(`Created release commit and tag ${tag}\n`);
