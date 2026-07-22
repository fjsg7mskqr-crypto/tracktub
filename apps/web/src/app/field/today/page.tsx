import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildTodayCards } from "@/lib/field/today";
import { TubCard } from "@/components/field/TubCard";

/**
 * Today prep brief (RSC). One card per tub the tech can see (RLS scopes
 * `property` to the current org / assignment). Surfaces the tech's own
 * in-progress draft as "Resume." Data model: `turnover.status` is
 * `draft` | `submitted_locked`; we map it onto the table-agnostic
 * `buildTodayCards` shape (draft ⇒ resumable; anything else ⇒ last visit).
 */
export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: properties } = await supabase
    .from("property")
    .select(
      `id, name,
       turnover(id, status, submitter_id, created_at, submitted_at_server)`
    )
    .order("created_at");

  const cards = buildTodayCards({
    properties: (properties ?? []).map((p) => ({ id: p.id, name: p.name })),
    turnovers: (properties ?? []).flatMap((p) =>
      (p.turnover ?? [])
        // Only the current tech's own draft is resumable (the draft action is
        // scoped to submitter_id); other users' drafts are ignored here.
        .filter((t) => t.status !== "draft" || t.submitter_id === user.id)
        .map((t) => ({
          id: t.id,
          propertyId: p.id,
          status: (t.status === "draft" ? "draft" : "submitted") as
            | "draft"
            | "submitted",
          at:
            t.status === "draft"
              ? t.created_at
              : t.submitted_at_server ?? t.created_at,
        }))
    ),
  });

  return (
    <main style={{ padding: "24px 16px", display: "grid", gap: 20 }}>
      <header style={{ display: "grid", gap: 6 }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--field-muted)",
            margin: 0,
          }}
        >
          Field
        </p>
        <h1
          style={{
            fontFamily: "var(--field-serif)",
            fontSize: 34,
            fontWeight: 600,
            lineHeight: 1.1,
            margin: 0,
            color: "var(--field-ink)",
          }}
        >
          Today
        </h1>
      </header>

      {cards.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.5,
            color: "var(--field-muted)",
            margin: 0,
          }}
        >
          No tubs yet. Your host will add you to a property.
        </p>
      ) : (
        <section style={{ display: "grid", gap: 14 }}>
          {cards.map((card) => (
            <TubCard key={card.propertyId} card={card} />
          ))}
        </section>
      )}
    </main>
  );
}
