import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PUBLIC_DIR = join(__dirname, "..", "public");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** True if the JPEG has an APP1 "Exif" segment (where GPS lives). */
function hasExifSegment(buf: Buffer): boolean {
  let i = 2; // after SOI
  while (i + 4 <= buf.length && buf[i] === 0xff) {
    const marker = buf[i + 1];
    if (marker === 0xda || marker === 0xd9) break; // start of scan / EOI
    const len = buf.readUInt16BE(i + 2);
    if (marker === 0xe1 && buf.toString("latin1", i + 4, i + 8) === "Exif") {
      return true;
    }
    i += 2 + len;
  }
  return false;
}

describe("public assets carry no EXIF/GPS", () => {
  const jpegs = walk(PUBLIC_DIR).filter((f) => /\.jpe?g$/i.test(f));

  it("finds the landing photos", () => {
    expect(jpegs.length).toBeGreaterThan(0);
  });

  it.each(jpegs)("%s has no EXIF segment", (file) => {
    expect(hasExifSegment(readFileSync(file))).toBe(false);
  });
});
