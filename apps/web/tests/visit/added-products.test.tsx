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
});

describe("AddedList", () => {
  const suggestions = [
    { product: "Chlorine granules", amount: "3 oz" },
    { product: "Alkalinity up", amount: "" },
  ];

  it("toggles a suggestion with its last amount and permits editing the amount", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <AddedList added={[]} suggestions={suggestions} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Chlorine granules" }));
    expect(onChange).toHaveBeenLastCalledWith([
      { product: "Chlorine granules", amount: "3 oz" },
    ]);
    rerender(
      <AddedList
        added={[{ product: "Chlorine granules", amount: "3 oz" }]}
        suggestions={suggestions}
        onChange={onChange}
      />
    );
    const amount = screen.getByRole("textbox", {
      name: "Amount for Chlorine granules",
    });
    fireEvent.change(amount, { target: { value: "5 oz" } });
    fireEvent.blur(amount);
    expect(onChange).toHaveBeenLastCalledWith([
      { product: "Chlorine granules", amount: "5 oz" },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Chlorine granules" }));
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
