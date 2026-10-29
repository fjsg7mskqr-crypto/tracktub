// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { RecordShareActions } from "@/components/record/RecordShareActions";
import { recordProofShare } from "@/lib/actions/proofEvent";

vi.mock("@/lib/actions/proofEvent", () => ({ recordProofShare: vi.fn() }));

const URL = "https://tracktub.com/proof/tok";
const writeText = vi.fn();
const execCommand = vi.fn();

beforeEach(() => {
  vi.mocked(recordProofShare).mockReset();
  writeText.mockReset().mockResolvedValue(undefined);
  execCommand.mockReset().mockReturnValue(false);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  // @ts-expect-error -- test cleanup of an optional browser API
  delete navigator.share;
});

function setShare(impl: (data: ShareData) => Promise<void>) {
  Object.defineProperty(navigator, "share", {
    value: vi.fn(impl),
    configurable: true,
  });
}

const renderActions = (url: string | null = URL) =>
  render(<RecordShareActions turnoverId="t1" url={url} tub="Cedar Cabin" />);

describe("RecordShareActions", () => {
  it("opens the share sheet with the link and records a send", async () => {
    setShare(() => Promise.resolve());
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Send to owner" }));
    await waitFor(() => expect(recordProofShare).toHaveBeenCalledWith("t1"));
    expect(navigator.share).toHaveBeenCalledWith({
      title: "Cedar Cabin record",
      url: URL,
    });
  });

  it("falls back to copy when there is no share sheet", async () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Send to owner" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(URL));
    expect(recordProofShare).toHaveBeenCalledWith("t1");
    expect(await screen.findByText("Link copied")).toBeTruthy();
  });

  it("cancel does not record a send", async () => {
    setShare(() => Promise.reject(new DOMException("cancelled", "AbortError")));
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Send to owner" }));
    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(recordProofShare).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copy link copies and records a send", async () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(URL));
    expect(recordProofShare).toHaveBeenCalledWith("t1");
  });

  it("without the Clipboard API (plain http) copies via a textarea", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    let copied: string | null = null;
    execCommand.mockImplementation((cmd: string) => {
      const el = document.activeElement as HTMLTextAreaElement | null;
      copied = el?.value.slice(el.selectionStart, el.selectionEnd) ?? null;
      return cmd === "copy";
    });
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByText("Link copied")).toBeTruthy();
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(copied).toBe(URL);
    expect(recordProofShare).toHaveBeenCalledWith("t1");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("a rejected clipboard write falls back to the textarea copy", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    execCommand.mockReturnValue(true);
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByText("Link copied")).toBeTruthy();
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(recordProofShare).toHaveBeenCalledWith("t1");
  });

  it("a failed copy says so and records nothing", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(
      await screen.findByText("Couldn't copy — press and hold the link below")
    ).toBeTruthy();
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(recordProofShare).not.toHaveBeenCalled();
  });

  it("without a link both buttons are disabled", () => {
    renderActions(null);
    for (const name of ["Send to owner", "Copy link"])
      expect(
        (screen.getByRole("button", { name }) as HTMLButtonElement).disabled
      ).toBe(true);
    expect(screen.getByText("No link yet.")).toBeTruthy();
  });
});
