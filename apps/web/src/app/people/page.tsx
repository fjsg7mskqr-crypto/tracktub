import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getURL } from "@/lib/url";
import { accessLabel } from "@/lib/people";
import { BackLink } from "@/components/tub/BackLink";
import { SectionLabel } from "@/components/tub/SectionLabel";
import { loadPeople } from "@/components/people/load";
import { AddPerson } from "@/components/people/AddPerson";
import { EditAccess } from "@/components/people/EditAccess";
import { RemovePerson } from "@/components/people/RemovePerson";
import { InviteLink } from "@/components/people/InviteLink";
import { CancelInvite } from "@/components/people/CancelInvite";
import { card, muted } from "@/components/people/styles";

const tag: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: 999,
  background: "#13233F",
  color: "#A9C9FF",
};

// People (D29): everyone with a login on the account. Everyone sees the list;
// only the admin (the account creator) adds, narrows or removes logins.
// Dynamic: getCurrentMembership() reads the session cookie.
export default async function PeoplePage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const isAdmin = membership.role === "operator";
  const supabase = await createClient();
  const { people, invites, properties } = await loadPeople(
    supabase,
    membership.orgId,
    isAdmin
  );
  const admins = people.filter((p) => p.isAdmin).map((p) => p.name);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: "16px 20px 24px",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <BackLink href="/" label="Home" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          People
        </h1>
        <p style={muted}>
          Everyone here can see tubs, run visits and send records.
          {!isAdmin &&
            admins.length > 0 &&
            ` Only ${admins.join(" or ")} can add or remove people.`}
        </p>
      </div>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {people.map((p) => (
          <li key={p.userId} style={card}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 600 }}>{p.name}</span>
                {p.userId === membership.userId && (
                  <span style={{ fontSize: 14, color: "var(--tt-text-3)" }}>
                    You
                  </span>
                )}
                {p.isAdmin && <span style={tag}>Admin</span>}
              </span>
              {p.email && p.email !== p.name && (
                <span style={{ fontSize: 14, color: "var(--tt-text-2)" }}>
                  {p.email}
                </span>
              )}
              <span style={{ fontSize: 14, color: "var(--tt-text-2)" }}>
                {accessLabel(p)}
              </span>
            </div>
            {isAdmin && !p.isAdmin && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                <EditAccess
                  userId={p.userId}
                  properties={properties}
                  allProperties={p.allProperties}
                  selected={p.propertyIds}
                />
                <RemovePerson userId={p.userId} name={p.name} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {isAdmin && invites.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel>Invited</SectionLabel>
          {invites.map((i) => (
            <div key={i.id} style={card}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  {i.email ?? "Invite link"}
                </span>
                <span style={{ fontSize: 14, color: "var(--tt-text-2)" }}>
                  {accessLabel({ isAdmin: false, ...i })} · not joined yet
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                <InviteLink
                  url={`${getURL()}/invite/${i.token}`}
                  showUrl={false}
                />
                <CancelInvite inviteId={i.id} />
              </div>
            </div>
          ))}
        </section>
      )}

      {isAdmin && <AddPerson properties={properties} />}
    </main>
  );
}
