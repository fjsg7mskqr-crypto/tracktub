import { notFound, redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/tub/BackLink";
import { TubBrief } from "@/components/tub/TubBrief";
import { TubLog } from "@/components/tub/TubLog";
import { buildBrief } from "@/components/tub/brief";
import { loadTub, loadTubVisits } from "../load";

// Screen 5 (spec §5): header, "Before you go in", Log. Dynamic:
// getCurrentMembership() reads the session cookie. Nothing is written on GET —
// a visit starts only from the Start visit button.
export default async function TubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [membership, tub, visits] = await Promise.all([
    getCurrentMembership(),
    loadTub(supabase, id),
    loadTubVisits(supabase, id),
  ]);
  if (!membership) redirect("/login");
  if (!tub) notFound();

  const locked = visits.filter((v) => v.status === "submitted_locked");
  const last = locked.at(-1) ?? null;
  const now = new Date();

  const sub = [
    tub.clientName,
    tub.address,
    tub.volumeGallons === null ? null : `${tub.volumeGallons} gal`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 26,
        padding: "16px 20px 32px",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <BackLink href="/tubs" label="Tubs" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {tub.name}
        </h1>
        {sub && (
          <p style={{ margin: 0, fontSize: 15, color: "var(--tt-text-2)" }}>
            {sub}
          </p>
        )}
      </div>
      <TubBrief
        tiles={buildBrief({
          tub,
          visits: locked,
          lastVisitOpened: last && last.shared ? last.opened : null,
          now,
        })}
      />
      <TubLog tubId={tub.id} visits={visits} now={now} />
    </main>
  );
}
