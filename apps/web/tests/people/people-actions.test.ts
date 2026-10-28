import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/auth";
import {
  addPersonAction,
  removePersonAction,
  updateAccessAction,
} from "@/lib/actions/people";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentMembership: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const admin = {
  userId: "admin",
  email: "a@x.com",
  orgId: "o1",
  role: "operator" as const,
};

/** Chainable builder: every call returns the chain; awaiting resolves `result`. */
function db(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "insert", "update", "delete"])
    chain[m] = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  chain.then = (r: (v: unknown) => unknown) => Promise.resolve(result).then(r);
  const from = vi.fn(() => chain);
  return { from, chain };
}

function fd(fields: Record<string, string>, props: string[] = []): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  for (const p of props) f.append("property", p);
  return f;
}

const empty = { error: null, link: null };

beforeEach(() => {
  vi.mocked(getCurrentMembership).mockResolvedValue(admin);
});
afterEach(() => vi.clearAllMocks());

describe("people actions", () => {
  it("a non-admin can't add, edit or remove", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue({
      ...admin,
      role: "staff",
    });
    const fake = db({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(fake as never);

    expect(
      (await addPersonAction(empty, fd({ email: "b@x.com", all: "on" }))).error
    ).toBe("Only the admin can add people.");
    expect(
      (
        await updateAccessAction(
          "u2",
          { error: null, done: false },
          fd({ all: "on" })
        )
      ).error
    ).toBe("Only the admin can change access.");
    expect((await removePersonAction("u2")).error).toBe(
      "Only the admin can remove people."
    );
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("the admin can't remove themselves", async () => {
    const fake = db({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(fake as never);
    expect((await removePersonAction("admin")).error).toBe(
      "You can't remove yourself."
    );
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("add person needs an email", async () => {
    vi.mocked(createClient).mockResolvedValue(
      db({ data: null, error: null }) as never
    );
    expect(
      (await addPersonAction(empty, fd({ email: "nope", all: "on" }))).error
    ).toBe("Enter their email.");
  });

  it("add person refuses an empty narrowed pick", async () => {
    vi.mocked(createClient).mockResolvedValue(
      db({ data: null, error: null }) as never
    );
    expect((await addPersonAction(empty, fd({ email: "b@x.com" }))).error).toBe(
      "Pick at least one property, or turn on All properties."
    );
  });

  it("add person returns an invite link", async () => {
    const fake = db({ data: { id: "i1", token: "tok123" }, error: null });
    vi.mocked(createClient).mockResolvedValue(fake as never);
    const res = await addPersonAction(
      empty,
      fd({ email: " b@x.com ", all: "on" })
    );
    expect(res.error).toBeNull();
    expect(res.link).toMatch(/\/invite\/tok123$/);
    expect(fake.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "o1",
        role: "staff",
        email: "b@x.com",
        all_properties: true,
        property_ids: [],
        invited_by: "admin",
      })
    );
  });
});
