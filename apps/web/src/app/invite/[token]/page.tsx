import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Seal } from "@/components/Seal";
import { Avatar, Badge, Button } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { AcceptButton } from "./AcceptButton";

interface InvitePreview {
  role: "staff" | "owner";
  org_name: string;
  all_properties: boolean;
  inviter_name: string;
  property_names: string[];
  expires_at: string;
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Anon-safe preview via SECURITY DEFINER RPC; null = missing/expired/accepted.
  const { data: previewRaw } = await supabase.rpc("get_invite_preview", {
    p_token: token,
  });
  const preview = previewRaw as InvitePreview | null;
  if (!preview) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // D29: a team login can do everything except manage logins. Owners have no
  // login in the app today; their branch is kept for old invite links.
  const isTeam = preview.role === "staff";
  const allProperties = isTeam && preview.all_properties;
  const roleLabel = isTeam ? "a team login" : "a viewer (read-only)";
  const can = isTeam
    ? ["See the tubs and run visits", "Send records to owners"]
    : ["View records for the properties below"];
  const cannot = isTeam
    ? `Only ${preview.inviter_name} adds or removes people.`
    : "No visits, billing or other people.";

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div
        className="container"
        style={{ maxWidth: 480, padding: "26px 18px 70px" }}
      >
        <div className="row" style={{ marginBottom: 18, gap: 10 }}>
          <span style={{ display: "inline-flex" }}>
            <Seal size={24} />
          </span>
          <span
            style={{
              fontFamily: "var(--sans)",
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: "-0.035em",
            }}
          >
            Track<b style={{ fontWeight: 600 }}>Tub</b>
          </span>
          <span className="eyebrow" style={{ marginLeft: "auto" }}>
            Team invitation
          </span>
        </div>

        <div className="card pad stack">
          <div className="row" style={{ gap: 12 }}>
            <Avatar name={preview.inviter_name} size="lg" variant="blue" />
            <div>
              <h1 style={{ fontSize: 20 }}>
                {preview.inviter_name} invited you
              </h1>
              <div className="small muted" style={{ marginTop: 2 }}>
                to help with {preview.org_name}
              </div>
            </div>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <span className="muted small">You&apos;re joining as</span>
            <Badge variant="brand">{roleLabel}</Badge>
          </div>

          {allProperties && (
            <p className="small" style={{ margin: 0 }}>
              You&apos;ll see every property on {preview.org_name}.
            </p>
          )}

          {!allProperties && preview.property_names.length > 0 && (
            <div>
              <div className="label">Properties you&apos;ll see</div>
              <div className="stack" style={{ gap: 6, marginTop: 6 }}>
                {preview.property_names.map((name) => (
                  <div
                    key={name}
                    className="note"
                    style={{ padding: "8px 12px" }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="note">
            <div className="stack" style={{ gap: 4 }}>
              {can.map((line) => (
                <div key={line}>
                  <span style={{ color: "var(--verified)" }}>✓</span> {line}
                </div>
              ))}
              <div className="dim">— {cannot}</div>
            </div>
          </div>

          <div className="tiny dim">
            This invitation expires {formatDateTime(preview.expires_at)}.
          </div>

          {user ? (
            <AcceptButton token={token} />
          ) : (
            <Link
              href={`/login?next=/invite/${token}`}
              className="btn primary block"
            >
              Continue with Google
            </Link>
          )}
        </div>

        {!allProperties && (
          <p
            className="tiny dim"
            style={{ textAlign: "center", marginTop: 16 }}
          >
            You&apos;ll see the properties listed above.
          </p>
        )}
      </div>
    </div>
  );
}
