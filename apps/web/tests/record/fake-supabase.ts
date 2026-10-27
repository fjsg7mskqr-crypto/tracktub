import { vi } from "vitest";

type Result = { data: unknown; error: unknown };

/** A table's result, or a list consumed one per query on that table (the
 *  last one repeats). */
type TableResult = Result | Result[];

/**
 * Minimal chainable stand-in for the Supabase query builder. `tables` maps a
 * table name to the result(s) its queries resolve to (via maybeSingle, single or
 * await); every filter/order call just returns the chain. `rpc` is a spy.
 */
export function fakeSupabase(
  tables: Record<string, TableResult>,
  rpc: (name: string, args: unknown) => Promise<Result> = () =>
    Promise.resolve({ data: null, error: null })
) {
  const calls: Record<string, number> = {};
  const from = vi.fn((table: string) => {
    const entry = tables[table] ?? { data: null, error: null };
    const n = (calls[table] = (calls[table] ?? -1) + 1);
    const result = Array.isArray(entry)
      ? entry[Math.min(n, entry.length - 1)]
      : entry;
    const chain: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "order", "limit", "not", "gte"])
      chain[m] = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(() => Promise.resolve(result));
    chain.single = vi.fn(() => Promise.resolve(result));
    chain.then = (resolve: (r: Result) => unknown) =>
      Promise.resolve(result).then(resolve);
    return chain;
  });
  return { from, rpc: vi.fn(rpc) };
}
