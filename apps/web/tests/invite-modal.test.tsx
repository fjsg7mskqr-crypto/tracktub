// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { InviteModal } from "@/app/team/InviteModal";

const createInviteAction = vi.fn();
vi.mock("@/lib/actions/invite", () => ({
  createInviteAction: (...args: unknown[]) => createInviteAction(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  createInviteAction.mockReset();
});

describe("InviteModal", () => {
  it("toggles role, selects a property, generates a link, and reveals the CopyField", async () => {
    createInviteAction.mockResolvedValue({
      ok: true,
      inviteId: "i1",
      token: "tok-abc",
    });

    render(
      <InviteModal
        properties={[
          { id: "p1", name: "Lakeview" },
          { id: "p2", name: "Aspen" },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Invite someone" }));
    // Role toggle → Viewer (owner).
    fireEvent.click(screen.getByRole("tab", { name: "Viewer" }));
    // Pick one property (multiselect shows because there are 2).
    fireEvent.click(screen.getByLabelText("Lakeview"));
    // Generate.
    fireEvent.click(screen.getByRole("button", { name: "Generate link" }));

    expect(await screen.findByText(/\/invite\/tok-abc/)).toBeTruthy();
    expect(createInviteAction).toHaveBeenCalledWith({
      role: "owner",
      propertyIds: ["p1"],
      email: null,
    });
  });

  it("auto-selects the only property and hides the multiselect for single-property hosts", async () => {
    createInviteAction.mockResolvedValue({
      ok: true,
      inviteId: "i2",
      token: "tok-solo",
    });

    render(<InviteModal properties={[{ id: "p1", name: "Lakeview" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Invite someone" }));
    // No checkbox to pick — the single property is pre-selected.
    expect(screen.queryByLabelText("Lakeview")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Generate link" }));

    expect(await screen.findByText(/\/invite\/tok-solo/)).toBeTruthy();
    expect(createInviteAction).toHaveBeenCalledWith({
      role: "staff",
      propertyIds: ["p1"],
      email: null,
    });
  });
});
