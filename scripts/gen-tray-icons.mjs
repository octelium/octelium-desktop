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
const CENTER = GRID / 2;
const INSET = 0.3;
const BLADE_WEIGHT = 2;

const CORE = 2.55;
const BADGE = { x: 12.5, y: 12.5, r: 2.8, gap: 4.15 };
const STRIKE = { from: 4.3, to: 11.7, width: 1.7, gap: 3 };

const TONES = {
  connected: "#059669",
  busy: "#D97706",
  idle: "#64748B",
  error: "#F43F5E",
  attention: "#D97706",
};

const ICONS = [
  { name: "connected", core: true, tone: TONES.connected },
  { name: "disconnected", tone: TONES.idle },
  { name: "signed-out", tone: TONES.idle, badge: true },
  { name: "unavailable", tone: TONES.error, strike: true },
  ...Array.from({ length: 8 }, (_, frame) => ({
    name: `busy-${frame}`,
    tone: TONES.busy,
    skip: frame,
  })),
];

const TARGETS = [
  { dir: "macos", size: 36, mono: true },
  { dir: "windows", size: 32, mono: false },
  { dir: "linux", size: 64, mono: false },
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

const blades = (skip) => {
  const drawn = mark.blades
    .filter((_, index) => index !== skip)
    .map((d) => `<path d="${d}"/>`)
    .join("");
  return `<g transform="translate(${INSET} ${INSET}) scale(${scale})" fill="currentColor" stroke="currentColor" stroke-width="${BLADE_WEIGHT}" stroke-linejoin="round">${drawn}</g>`;
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

const render = (icon, color, mono) => {
  let body = blades(icon.skip);

  if (icon.core) {
    body += `<circle cx="${CENTER}" cy="${CENTER}" r="${CORE}" fill="currentColor"/>`;
  }

  if (icon.badge) {
    body = overlay(
      body,
      `<circle cx="${BADGE.x}" cy="${BADGE.y}" r="${BADGE.gap}" fill="#000"/>`,
      `<circle cx="${BADGE.x}" cy="${BADGE.y}" r="${BADGE.r}" fill="${mono ? "currentColor" : TONES.attention}"/>`,
    );
  }

  if (icon.strike) {
    const line = (width, stroke) =>
      `<path d="M${STRIKE.from} ${STRIKE.from}L${STRIKE.to} ${STRIKE.to}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`;
    body = overlay(
      body,
      line(STRIKE.gap, "#000"),
      line(STRIKE.width, "currentColor"),
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${GRID}" height="${GRID}" viewBox="0 0 ${GRID} ${GRID}" color="${color}">${body}</svg>`;
};

const main = () => {
  const scratch = mkdtempSync(join(tmpdir(), "octelium-tray-"));

  for (const target of TARGETS) {
    const dir = join(OUT_DIR, target.dir);
    mkdirSync(dir, { recursive: true });

    for (const icon of ICONS) {
      const source = join(scratch, `${target.dir}-${icon.name}.svg`);
      writeFileSync(
        source,
        render(icon, target.mono ? "#000000" : icon.tone, target.mono),
      );
      execFileSync("rsvg-convert", [
        "-w",
        String(target.size),
        "-h",
        String(target.size),
        source,
        "-o",
        join(dir, `${icon.name}.png`),
      ]);
    }

    process.stdout.write(
      `Generated ${ICONS.length} ${target.size}px icons into icons/tray/${target.dir}\n`,
    );
  }

  rmSync(scratch, { recursive: true, force: true });
};

main();
