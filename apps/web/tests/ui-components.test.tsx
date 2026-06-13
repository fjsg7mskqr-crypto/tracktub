// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Modal } from "@/components/ui/Modal";
import { CopyField } from "@/components/ui/CopyField";

afterEach(cleanup);

function ModalHarness() {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(true)}>reopen</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Test modal">
        <p>Body content</p>
      </Modal>
    </div>
  );
}

describe("Modal", () => {
  it("renders an accessible dialog when open", () => {
    render(<ModalHarness />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("Body content")).toBeTruthy();
  });

  it("closes on Escape", () => {
    render(<ModalHarness />);
    expect(screen.queryByRole("dialog")).not.toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on backdrop mousedown but not on content mousedown", () => {
    render(<ModalHarness />);
    const dialog = screen.getByRole("dialog");
    // Clicking inside the dialog does not close it.
    fireEvent.mouseDown(screen.getByText("Body content"));
    expect(screen.queryByRole("dialog")).not.toBeNull();
    // Clicking the backdrop (the dialog's parent) closes it.
    const backdrop = dialog.parentElement as HTMLElement;
    fireEvent.mouseDown(backdrop);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("locks body scroll while open and restores it on close", () => {
    render(<ModalHarness />);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

describe("CopyField", () => {
  it("writes the value to the clipboard and shows a copied state", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<CopyField value="https://tracktub.com/invite/abc123" />);
    const button = screen.getByRole("button", { name: "Copy" });
    fireEvent.click(button);

    expect(writeText).toHaveBeenCalledWith(
      "https://tracktub.com/invite/abc123"
    );
    expect(await screen.findByText("Copied")).toBeTruthy();
  });

  it("still flashes copied state when the clipboard API rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    render(<CopyField value="token-xyz" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(await screen.findByText("Copied")).toBeTruthy();
  });
});
