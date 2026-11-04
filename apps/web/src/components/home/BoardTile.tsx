import Link from "next/link";
import { tubPath } from "@/lib/app-routes";
import { AddToToday } from "./AddToToday";
import { CareRing } from "./CareRing";
import { Chip } from "./Chip";
import { OpenItemCheck } from "./OpenItemCheck";
import type { BoardEntry, Ring } from "./home-model";
import type { OpenItem } from "./open-items";

/** Open-item rows a tile shows before "+N more". */
export const TILE_ITEMS = 2;

export type TileData = {
  entry: BoardEntry;
  ring: Ring;
  /** "Lakeview Rentals · on today's route". */
  subline: string | null;
  items: OpenItem[];
  /** "Last visit Oct 31" · "Host opened report". */
  footer: [string, string] | null;
  draftId: string | null;
  onRoute: boolean;
  /** Added to today by hand (so it can be removed). */
  added: boolean;
};

const card: React.CSSProperties = {
  background: "var(--tt-surface)",
  borderRadius: "var(--tt-radius-tile)",
  color: "var(--tt-text)",
};

/**
 * One tub on the status board: care ring, name + status chip, sub-line, open
 * items, last visit · report state. A calm tub collapses to one row. The ring
 * + name open the tub page.
 */
export function BoardTile({ tile }: { tile: TileData }) {
  const { entry, ring } = tile;
  const head = (
    <Link
      href={tubPath(entry.tubId)}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: "var(--tt-tap)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: "var(--tt-text)",
        textDecoration: "none",
      }}
    >
      <CareRing ring={ring} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {entry.name}
          </span>
          <Chip text={entry.chip.text} tone={entry.chip.tone} />
        </span>
        {tile.subline && entry.state !== "calm" && (
          <span style={{ fontSize: 13, color: "var(--tt-text-2)" }}>
            {tile.subline}
          </span>
        )}
      </span>
    </Link>
  );
  const routeAction = (!tile.onRoute || tile.added) && (
    <AddToToday tubId={entry.tubId} tubName={entry.name} added={tile.added} />
  );

  if (entry.state === "calm")
    return (
      <article
        aria-label={entry.name}
        style={{
          ...card,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "8px 8px 8px 12px",
        }}
      >
        {head}
        {routeAction}
      </article>
    );

  const shown = tile.items.slice(0, TILE_ITEMS);
  const more = tile.items.length - shown.length;
  return (
    <article
      aria-label={entry.name}
      style={{
        ...card,
        padding: "12px 12px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        boxShadow:
          entry.state === "problem"
            ? "inset 3px 0 0 var(--tt-alert)"
            : undefined,
      }}
    >
      {head}
      {shown.length > 0 && (
        <div
          style={{ paddingLeft: 58, display: "flex", flexDirection: "column" }}
        >
          {shown.map((it) => (
            <OpenItemCheck key={it.id} item={it} draftId={tile.draftId} />
          ))}
          {more > 0 && (
            <Link
              href={tubPath(entry.tubId)}
              style={{
                fontSize: 13,
                color: "var(--tt-link)",
                textDecoration: "none",
                minHeight: 32,
                display: "flex",
                alignItems: "center",
              }}
            >
              +{more} more
            </Link>
          )}
        </div>
      )}
      <div
        style={{
          paddingLeft: 58,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 12.5,
          color: "var(--tt-text-3)",
        }}
      >
        {tile.footer ? (
          <span>
            {tile.footer[0]} · {tile.footer[1]}
          </span>
        ) : (
          <span />
        )}
        {routeAction}
      </div>
    </article>
  );
}
