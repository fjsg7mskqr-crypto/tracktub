// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compressPhoto, PhotoProcessError } from "@/lib/compress-photo";

const file = new File(["original-with-gps"], "a.jpg", { type: "image/jpeg" });
const jpeg = () =>
  new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });

type Setup = {
  bitmap?: () => Promise<unknown>;
  ctx?: unknown;
  blob?: Blob | null;
};

function setup({ bitmap, ctx = { drawImage: vi.fn() }, blob = jpeg() }: Setup) {
  const close = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    bitmap ?? (async () => ({ width: 4000, height: 3000, close }))
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as never
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(((
    cb: BlobCallback
  ) => cb(blob)) as never);
  return { close };
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("compressPhoto", () => {
  it("returns the re-encoded JPEG, scaled to 2048px", async () => {
    const out = jpeg();
    const { close } = setup({ blob: out });
    const result = await compressPhoto(file);
    expect(result).toBe(out);
    expect(result).not.toBe(file);
    expect(close).toHaveBeenCalled();
  });

  it("throws when the browser can't decode the photo", async () => {
    setup({
      bitmap: async () => {
        throw new Error("decode");
      },
    });
    await expect(compressPhoto(file)).rejects.toBeInstanceOf(PhotoProcessError);
  });

  it("throws when there is no 2d context", async () => {
    const { close } = setup({ ctx: null });
    await expect(compressPhoto(file)).rejects.toBeInstanceOf(PhotoProcessError);
    expect(close).toHaveBeenCalled();
  });

  it("throws when toBlob gives nothing", async () => {
    setup({ blob: null });
    await expect(compressPhoto(file)).rejects.toBeInstanceOf(PhotoProcessError);
  });

  it("throws when the encoded result isn't a JPEG", async () => {
    setup({ blob: new Blob(["GIF89a"], { type: "image/gif" }) });
    await expect(compressPhoto(file)).rejects.toBeInstanceOf(PhotoProcessError);
  });
});
