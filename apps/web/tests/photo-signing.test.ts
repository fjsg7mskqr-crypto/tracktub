import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));

import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/service";
import { PHOTO_URL_TTL_SECONDS, signPhotoUrls } from "@/lib/supabase/storage";
import { signProofPhotos } from "@/lib/proof-photos";
import { mockupRow } from "./record/fixtures";

function storage(
  respond?: (paths: string[]) => { data: unknown; error: unknown }
) {
  const createSignedUrls = vi.fn(async (paths: string[]) =>
    respond
      ? respond(paths)
      : {
          data: paths.map((path) => ({
            path,
            signedUrl: `https://x.test/sign/${path}?token=t`,
            error: null,
          })),
          error: null,
        }
  );
  const from = vi.fn(() => ({ createSignedUrls }));
  return { client: { storage: { from } } as never, createSignedUrls, from };
}

beforeEach(() => vi.clearAllMocks());

describe("signPhotoUrls", () => {
  it("signs every path in ONE call, deduped, with the 1h expiry", async () => {
    const s = storage();
    const urls = await signPhotoUrls(s.client, ["a", "b", "a", null, ""]);
    expect(s.from).toHaveBeenCalledWith("photos");
    expect(s.createSignedUrls).toHaveBeenCalledTimes(1);
    expect(s.createSignedUrls).toHaveBeenCalledWith(
      ["a", "b"],
      PHOTO_URL_TTL_SECONDS
    );
    expect(PHOTO_URL_TTL_SECONDS).toBe(3600);
    expect(urls.get("a")).toBe("https://x.test/sign/a?token=t");
  });

  it("makes no call when there is nothing to sign", async () => {
    const s = storage();
    expect((await signPhotoUrls(s.client, [])).size).toBe(0);
    expect(s.createSignedUrls).not.toHaveBeenCalled();
  });

  it("a path that can't be signed comes back null, the rest still sign", async () => {
    const s = storage((paths) => ({
      data: [
        { path: paths[0], signedUrl: "https://x.test/ok", error: null },
        { path: paths[1], signedUrl: null, error: "Object not found" },
      ],
      error: null,
    }));
    const urls = await signPhotoUrls(s.client, ["ok", "gone"]);
    expect(urls.get("ok")).toBe("https://x.test/ok");
    expect(urls.get("gone")).toBeNull();
  });

  it("a storage failure yields nulls, never throws", async () => {
    const s = storage(() => ({ data: null, error: new Error("down") }));
    const urls = await signPhotoUrls(s.client, ["a"]);
    expect(urls.get("a")).toBeNull();
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});

describe("signProofPhotos", () => {
  it("signs only the paths in the proof_record row", async () => {
    const s = storage();
    vi.mocked(createServiceClient).mockReturnValue(s.client);
    const row = mockupRow();
    const urls = await signProofPhotos(row);
    const expected = row.photos.map((p) => p.storage_path).sort();
    expect([...urls.keys()].sort()).toEqual(expected);
    expect(s.createSignedUrls).toHaveBeenCalledTimes(1);
    expect(s.createSignedUrls.mock.calls[0][0].sort()).toEqual(expected);
  });

  it("skips photos with no path and refuses traversal paths", async () => {
    const s = storage();
    vi.mocked(createServiceClient).mockReturnValue(s.client);
    const row = mockupRow();
    row.photos = [
      { ...row.photos[0], storage_path: null },
      { ...row.photos[0], storage_path: "../other-org/x.jpg" },
      { ...row.photos[0], storage_path: "/abs.jpg" },
      { ...row.photos[0], storage_path: "org/t/ok.jpg" },
    ];
    await signProofPhotos(row);
    expect(s.createSignedUrls.mock.calls[0][0]).toEqual(["org/t/ok.jpg"]);
  });

  it("without the service key: placeholders, and Sentry hears once", async () => {
    vi.mocked(createServiceClient).mockReturnValue(null);
    const row = mockupRow();
    const first = await signProofPhotos(row);
    await signProofPhotos(row);
    expect([...first.values()].every((v) => v === null)).toBe(true);
    expect(first.size).toBe(row.photos.length);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
  });
});
