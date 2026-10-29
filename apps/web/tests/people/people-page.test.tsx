// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/auth";
import PeoplePage from "@/app/people/page";
import { fakeSupabase } from "../record/fake-supabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentMembership: vi.fn() }));
vi.mock("@/lib/actions/people", () => ({
  addPersonAction: vi.fn(),
  updateAccessAction: vi.fn(),
  removePersonAction: vi.fn(),
}));
vi.mock("@/lib/actions/invite", () => ({ revokeInviteAction: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const me = (role: "operator" | "staff", userId = "admin") => ({
  userId,
  email: "e@x.com",
  orgId: "o1",
  role,
});

const ok = (data: unknown) => ({ data, error: null });

const props = ok([
  { id: "p1", name: "Cedar Cabin" },
  { id: "p2", name: "Lake House" },
  { id: "p3", name: "Pine Lodge" },
]);

function team() {
  vi.mocked(createClient).mockResolvedValue(
    fakeSupabase({
      membership: ok([
        {
          user_id: "admin",
          role: "operator",
          all_properties: true,
          profile: { full_name: "Ethan Novak", email: "ethan@x.com" },
        },
        {
          user_id: "sam",
          role: "staff",
          all_properties: false,
          profile: { full_name: "Sam Rivera", email: "sam@x.com" },
        },
      ]),
      property: props,
      staff_assignment: ok([
        { property_id: "p1", staff_user_id: "sam" },
        { property_id: "p2", staff_user_id: "sam" },
      ]),
      invite: ok([]),
    }) as never
  );
}

beforeEach(() => {
  vi.mocked(getCurrentMembership).mockResolvedValue(me("operator"));
});
afterEach(cleanup);

describe("/people", () => {
  it("one-login account: just you, the Admin tag and a quiet Add person", async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase({
        membership: ok([
          {
            user_id: "admin",
            role: "operator",
            all_properties: true,
            profile: { full_name: "Ethan Novak", email: "ethan@x.com" },
          },
        ]),
        property: props,
        staff_assignment: ok([]),
        invite: ok([]),
      }) as never
    );
    render(await PeoplePage());
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "People"
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText("Ethan Novak")).toBeTruthy();
    expect(within(rows[0]).getByText("Admin")).toBeTruthy();
    expect(within(rows[0]).getByText("All properties")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add person" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
    expect(screen.queryByText("Invited")).toBeNull();
  });

  it("admin sees a narrowed person with edit and remove", async () => {
    team();
    render(await PeoplePage());
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const sam = rows.find((r) => within(r).queryByText("Sam Rivera"))!;
    expect(within(sam).getByText("2 properties")).toBeTruthy();
    expect(
      within(sam).getByRole("button", { name: "Edit access" })
    ).toBeTruthy();
    expect(within(sam).getByRole("button", { name: "Remove" })).toBeTruthy();
    const admin = rows.find((r) => within(r).queryByText("Ethan Novak"))!;
    expect(within(admin).queryByRole("button", { name: "Remove" })).toBeNull();
  });

  it("a non-admin sees everyone but no add, edit or remove", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(me("staff", "sam"));
    team();
    render(await PeoplePage());
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Add person" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit access" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
    expect(
      screen.getByText(/Only Ethan Novak can add or remove people/)
    ).toBeTruthy();
  });

  it("admin sees pending invites", async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase({
        membership: ok([
          {
            user_id: "admin",
            role: "operator",
            all_properties: true,
            profile: { full_name: "Ethan Novak", email: "ethan@x.com" },
          },
        ]),
        property: props,
        staff_assignment: ok([]),
        invite: ok([
          {
            id: "i1",
            email: "jo@x.com",
            token: "tok",
            all_properties: false,
            property_ids: ["p1"],
            accepted_at: null,
            expires_at: "2999-01-01T00:00:00Z",
          },
          {
            id: "i2",
            email: "old@x.com",
            token: "tok2",
            all_properties: true,
            property_ids: [],
            accepted_at: null,
            expires_at: "2000-01-01T00:00:00Z",
          },
        ]),
      }) as never
    );
    render(await PeoplePage());
    expect(screen.getByText("Invited")).toBeTruthy();
    expect(screen.getByText("jo@x.com")).toBeTruthy();
    expect(screen.queryByText("old@x.com")).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel invite" })).toBeTruthy();
  });

  it("signed out redirects", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(null);
    await expect(PeoplePage()).rejects.toThrow("NEXT_REDIRECT");
  });
});
