import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership, getVerifiedMembership } from "@/lib/auth";
import { fakeSupabase } from "./record/fake-supabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const ok = (data: unknown) => ({ data, error: null });

/** A fake client whose session is `sub`/`email` (null → signed out). */
function client(
  user: { sub: string; email: string } | null,
  tables: Parameters<typeof fakeSupabase>[0]
) {
  const db = fakeSupabase(tables);
  const auth = {
    getClaims: vi.fn(async () => ({
      data: user ? { claims: user } : null,
      error: null,
    })),
    getUser: vi.fn(async () => ({
      data: { user: user ? { id: user.sub, email: user.email } : null },
      error: null,
    })),
  };
  vi.mocked(createClient).mockResolvedValue({ ...db, auth } as never);
  return { ...db, auth };
}

const ME = { sub: "u1", email: "host@x.com" };

beforeEach(() => vi.mocked(createClient).mockReset());

describe("getCurrentMembership", () => {
  it("reads identity from verified claims, not the auth server", async () => {
    const c = client(ME, {
      membership: ok([{ org_id: "o1", role: "operator" }]),
      property: ok([{ org_id: "o1" }]),
    });
    expect(await getCurrentMembership()).toEqual({
      userId: "u1",
      email: "host@x.com",
      orgId: "o1",
      role: "operator",
    });
    expect(c.auth.getClaims).toHaveBeenCalled();
    expect(c.auth.getUser).not.toHaveBeenCalled();
  });

  it("is null when signed out, without querying memberships", async () => {
    const c = client(null, {});
    expect(await getCurrentMembership()).toBeNull();
    expect(c.from).not.toHaveBeenCalled();
  });

  it("is null without a membership", async () => {
    client(ME, { membership: ok([]), property: ok([]) });
    expect(await getCurrentMembership()).toBeNull();
  });

  it("counts only the caller's operator orgs as having tubs", async () => {
    // An invited cleaner: own empty operator workspace + staff in the host's
    // org. RLS shows the host's tubs, but that org is not theirs to operate.
    client(ME, {
      membership: ok([
        { org_id: "own", role: "operator" },
        { org_id: "host", role: "staff" },
      ]),
      property: ok([{ org_id: "host" }, { org_id: "host" }]),
    });
    expect(await getCurrentMembership()).toMatchObject({
      orgId: "host",
      role: "staff",
    });
  });

  it("an operator org with tubs wins", async () => {
    client(ME, {
      membership: ok([
        { org_id: "host", role: "staff" },
        { org_id: "own", role: "operator" },
      ]),
      property: ok([{ org_id: "own" }, { org_id: "host" }]),
    });
    expect(await getCurrentMembership()).toMatchObject({
      orgId: "own",
      role: "operator",
    });
  });
});

describe("getVerifiedMembership", () => {
  it("re-checks the user with the auth server", async () => {
    const c = client(ME, {
      membership: ok([{ org_id: "o1", role: "operator" }]),
      property: ok([]),
    });
    expect(await getVerifiedMembership()).toMatchObject({
      userId: "u1",
      role: "operator",
    });
    expect(c.auth.getUser).toHaveBeenCalled();
  });

  it("is null when the auth server rejects the session", async () => {
    const c = client(ME, {});
    c.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await getVerifiedMembership()).toBeNull();
  });
});
