#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MARK_PATH = join(ROOT, "src", "assets", "mark.svg");
const OUT_DIR = join(ROOT, "src-tauri", "icons", "tray");

const GRID = 16;
const INSET = 0.3;
const BADGE = { x: 12.5, y: 12.5, r: 2.8, gap: 4.15 };

const SCHEMES = [
  {
    name: "light",
    mark: "#000000",
    connected: "#16A34A",
    signedOut: "#64748B",
  },
  {
    name: "dark",
    mark: "#FFFFFF",
    connected: "#22C55E",
    signedOut: "#A1A1AA",
  },
];

const ICONS = [
  { name: "logo" },
  { name: "connected", badge: "connected" },
  { name: "signed-out", badge: "signedOut" },
];

const TARGETS = [
  { dir: "macos", size: 36 },
  { dir: "windows", size: 32 },
  { dir: "linux", size: 64 },
];

const readMark = () => {
  const source = readFileSync(MARK_PATH, "utf8");
  const viewBox = source.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const blades = [...source.matchAll(/<path d="([^"]+)"/g)].map(
    (match) => match[1],
  );

  if (!viewBox || blades.length !== 8) {
    throw new Error(`Expected a 0 0 w h viewBox and 8 blades in ${MARK_PATH}`);
  }

  return { size: Number(viewBox[1]), blades };
};

const mark = readMark();
const scale = Number(((GRID - 2 * INSET) / mark.size).toFixed(8));

const blades = (scheme) => {
  const drawn = mark.blades.map((d) => `<path d="${d}"/>`).join("");
  return `<g transform="translate(${INSET} ${INSET}) scale(${scale})" fill="${scheme.mark}">${drawn}</g>`;
};

const overlay = (
  body,
  cut,
  draw,
) => `<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="${GRID}" height="${GRID}">
<rect width="${GRID}" height="${GRID}" fill="#fff"/>
${cut}
</mask>
<g mask="url(#cut)">${body}</g>
${draw}`;

const render = (icon, scheme) => {
  let body = blades(scheme);

  if (icon.badge) {
    body = overlay(
      body,
      `<circle cx="${BADGE.x}" cy="${BADGE.y}" r="${BADGE.gap}" fill="#000"/>`,
      `<circle cx="${BADGE.x}" cy="${BADGE.y}" r="${BADGE.r}" fill="${scheme[icon.badge]}"/>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${GRID}" height="${GRID}" viewBox="0 0 ${GRID} ${GRID}">${body}</svg>`;
};

const main = () => {
  const scratch = mkdtempSync(join(tmpdir(), "octelium-tray-"));

  for (const target of TARGETS) {
    const dir = join(OUT_DIR, target.dir);
    mkdirSync(dir, { recursive: true });

    for (const scheme of SCHEMES) {
      for (const icon of ICONS) {
        const source = join(scratch, `${target.dir}-${scheme.name}-${icon.name}.svg`);
        writeFileSync(source, render(icon, scheme));
        execFileSync("rsvg-convert", [
          "-w",
          String(target.size),
          "-h",
          String(target.size),
          source,
          "-o",
          join(dir, `${icon.name}-${scheme.name}.png`),
        ]);
      }
    }

    process.stdout.write(
      `Generated ${ICONS.length * SCHEMES.length} ${target.size}px icons into icons/tray/${target.dir}\n`,
    );
  }

  rmSync(scratch, { recursive: true, force: true });
};

main();
