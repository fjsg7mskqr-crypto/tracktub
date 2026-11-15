// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AddedList } from "@/components/visit/AddedList";
import { buildProductSuggestions, encodeAdded } from "@/lib/visit";

afterEach(cleanup);

describe("product suggestions", () => {
  it("puts this tub before other org products and defaults, with latest amount per scope", () => {
    const suggestions = buildProductSuggestions("tub-1", [
      {
        property_id: "tub-2",
        treatments: ["pH Down · 4 oz", "Clarifier · 1 oz"],
      },
      {
        property_id: "tub-1",
        treatments: ["Chlorine granules · 3 oz", "PH DOWN · 2 oz"],
      },
      { property_id: "tub-1", treatments: ["chlorine GRANULES · 1 oz"] },
      { property_id: "tub-2", treatments: ["Defoamer · 2 oz"] },
    ]);
    expect(suggestions.slice(0, 4)).toEqual([
      { product: "Chlorine granules", amount: "3 oz" },
      { product: "PH DOWN", amount: "2 oz" },
      { product: "Clarifier", amount: "1 oz" },
      { product: "Defoamer", amount: "2 oz" },
    ]);
    expect(
      suggestions.filter((s) => s.product.toLowerCase() === "ph down")
    ).toHaveLength(1);
    expect(suggestions.find((s) => s.product === "Alkalinity up")?.amount).toBe(
      ""
    );
  });

  it("labels legacy codes before de-duplicating them with defaults", () => {
    const suggestions = buildProductSuggestions("tub-1", [
      {
        property_id: "tub-1",
        treatments: [
          "ph_up",
          "ph_down",
          "alkalinity_up",
          "clarifier",
          "sanitizer",
          "shock",
        ],
      },
    ]);
    expect(suggestions.slice(0, 6).map((s) => s.product)).toEqual([
      "pH Up",
      "pH Down",
      "Alkalinity Up",
      "Clarifier",
      "Chlorine granules",
      "Shock",
    ]);
    expect(
      suggestions.filter((s) => s.product.toLowerCase() === "ph up")
    ).toHaveLength(1);
    expect(suggestions.some((s) => s.product === "sanitizer")).toBe(false);
  });

  it("keeps generic sanitizer wording when this tub has a different chlorine product", () => {
    const suggestions = buildProductSuggestions("tub-1", [
      {
        property_id: "tub-1",
        treatments: ["Chlorine tablets · 1 tab", "sanitizer"],
      },
    ]);
    expect(suggestions.slice(0, 2)).toEqual([
      { product: "Chlorine tablets", amount: "1 tab" },
      { product: "Chlorine / Bromine", amount: "" },
    ]);
  });

  it("does not mistake non-chlorine shock for a chlorine product", () => {
    const suggestions = buildProductSuggestions("tub-1", [
      { property_id: "tub-1", treatments: ["Non-chlorine shock", "sanitizer"] },
    ]);
    expect(suggestions[1]).toEqual({
      product: "Chlorine granules",
      amount: "",
    });
  });
});

describe("AddedList", () => {
  const suggestions = [
    { product: "Chlorine granules", amount: "3 oz" },
    { product: "Alkalinity up", amount: "" },
  ];

  it("opens an amount sheet with last-used amount and quick picks before adding", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <AddedList added={[]} suggestions={suggestions} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Chlorine granules" }));
    expect(onChange).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: "Chlorine granules" });
    expect(dialog).toBeTruthy();
    const amount = screen.getByRole("textbox", {
      name: "Amount",
    }) as HTMLInputElement;
    expect(amount.value).toBe("3 oz");
    expect(amount.getAttribute("inputmode")).toBe("decimal");
    expect(document.activeElement).not.toBe(amount);
    expect(screen.getAllByRole("button", { name: "3 oz" })).toHaveLength(1);
    const quickPicks = [...dialog.querySelectorAll("[aria-pressed]")];
    expect(quickPicks[0].textContent).toBe("3 oz");
    fireEvent.click(screen.getByRole("button", { name: "2 oz" }));
    expect(amount.value).toBe("2 oz");
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onChange).toHaveBeenLastCalledWith([
      { product: "Chlorine granules", amount: "2 oz" },
    ]);
    rerender(
      <AddedList
        added={[{ product: "Chlorine granules", amount: "2 oz" }]}
        suggestions={suggestions}
        onChange={onChange}
      />
    );
    expect(
      screen.getByRole("button", { name: "Chlorine granules · 2 oz" })
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Chlorine granules · 2 oz" })
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), {
      target: { value: "5 oz" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onChange).toHaveBeenLastCalledWith([
      { product: "Chlorine granules", amount: "5 oz" },
    ]);
  });

  it("removes a selected product from its sheet and cancels on backdrop tap", () => {
    const onChange = vi.fn();
    const selected = [{ product: "Chlorine granules", amount: "3 oz" }];
    render(
      <AddedList
        added={selected}
        suggestions={suggestions}
        onChange={onChange}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Chlorine granules · 3 oz" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Close amount sheet" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Chlorine granules · 3 oz" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("lets Other add a new product and amount in the unchanged saved shape", () => {
    const onChange = vi.fn();
    render(
      <AddedList added={[]} suggestions={suggestions} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Other product" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Product" }), {
      target: { value: " Enzyme " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), {
      target: { value: " 2 oz " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onChange).toHaveBeenCalledWith([
      { product: "Enzyme", amount: "2 oz" },
    ]);
    expect(onChange.mock.lastCall?.[0].map(encodeAdded)).toEqual([
      "Enzyme · 2 oz",
    ]);
  });

  it("starts a default product with an empty amount", () => {
    const onChange = vi.fn();
    render(
      <AddedList added={[]} suggestions={suggestions} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Alkalinity up" }));
    expect(
      (screen.getByRole("textbox", { name: "Amount" }) as HTMLInputElement)
        .value
    ).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onChange).toHaveBeenCalledWith([
      { product: "Alkalinity up", amount: "" },
    ]);
  });

  it("shows a custom product only once when saved names differ by case", () => {
    render(
      <AddedList
        added={[
          { product: "Enzyme", amount: "1 oz" },
          { product: "ENZYME", amount: "2 oz" },
        ]}
        suggestions={suggestions}
        onChange={vi.fn()}
      />
    );
    expect(screen.getAllByRole("button", { name: /enzyme/i })).toHaveLength(1);
  });
});
