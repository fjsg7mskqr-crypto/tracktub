import { vi } from "vitest";

type Result = { data: unknown; error: unknown };

/**
 * Minimal chainable stand-in for the Supabase query builder. `tables` maps a
 * table name to the result its query resolves to (via maybeSingle, single or
 * await); every filter/order call just returns the chain. `rpc` is a spy.
 */
export function fakeSupabase(
  tables: Record<string, Result>,
  rpc: (name: string, args: unknown) => Promise<Result> = () =>
    Promise.resolve({ data: null, error: null })
) {
  const from = vi.fn((table: string) => {
    const result = tables[table] ?? { data: null, error: null };
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
