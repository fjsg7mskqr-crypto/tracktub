import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

// This is the M1 security gate. It needs the service-role key to provision and
// tear down test data, so it skips cleanly when that key is absent (e.g. CI
// without secrets). The skip is made LOUD here (and CI annotates it) so a
// perpetually-skipped gate can't masquerade as a passing one.
const ready = Boolean(url && anon && service);
if (!ready) {
  console.warn(
    "⚠ RLS isolation suite SKIPPED — Supabase env not configured; the security gate is NOT enforced in this run.",
  );
}

describe.skipIf(!ready)("RLS isolation", () => {
  // NOTE: a describe body still RUNS at collection time even when skipIf is true
  // (only the tests/hooks are skipped). So the admin client must be created in
  // beforeAll, not here — createClient throws on an empty URL, which would crash
  // collection in CI when the secrets are absent.
  let admin!: SupabaseClient<Database>;

  // One password for all ephemeral test users; emails are unique per run.
  const password = `pw-${randomUUID()}`;
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];

  type AuthedUser = { id: string; client: SupabaseClient<Database> };

  // Create a confirmed user and return a Supabase client authenticated AS them,
  // so its requests carry that user's JWT and RLS sees auth.uid() = their id.
  async function makeUser(label: string): Promise<AuthedUser> {
    const email = `rls-${label}-${randomUUID()}@tracktub.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("createUser returned no user");
    createdUserIds.push(data.user.id);

    const client = createClient<Database>(url!, anon!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
    return { id: data.user.id, client };
  }

  let operatorA: AuthedUser;
  let staffA: AuthedUser;
  let operatorB: AuthedUser;
  let orgA: string;
  let orgB: string;
  let propAssigned: string;
  let propUnassigned: string;
  let propB: string;

  beforeAll(async () => {
    admin = createClient<Database>(url!, service!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Recover from any data leaked by a previously-interrupted run (shared project).
    await admin.from("org").delete().like("name", "RLS Test Org%");
    const { data: stale } = await admin.auth.admin.listUsers();
    for (const u of stale?.users ?? []) {
      if (u.email?.startsWith("rls-") && u.email.endsWith("@tracktub.test")) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }

    operatorA = await makeUser("op-a");
    staffA = await makeUser("staff-a");
    operatorB = await makeUser("op-b");

    const { data: oA, error: eA } = await admin
      .from("org")
      .insert({ name: "RLS Test Org A" })
      .select("id")
      .single();
    const { data: oB, error: eB } = await admin
      .from("org")
      .insert({ name: "RLS Test Org B" })
      .select("id")
      .single();
    if (eA || eB || !oA || !oB) throw eA ?? eB ?? new Error("org insert failed");
    orgA = oA.id;
    orgB = oB.id;
    createdOrgIds.push(orgA, orgB);

    const { error: mErr } = await admin.from("membership").insert([
      { user_id: operatorA.id, org_id: orgA, role: "operator" },
      { user_id: staffA.id, org_id: orgA, role: "staff" },
      { user_id: operatorB.id, org_id: orgB, role: "operator" },
    ]);
    if (mErr) throw mErr;

    const ins = async (org_id: string, name: string) => {
      const { data, error } = await admin
        .from("property")
        .insert({ org_id, name })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("property insert failed");
      return data.id;
    };
    propAssigned = await ins(orgA, "Assigned");
    propUnassigned = await ins(orgA, "Unassigned");
    propB = await ins(orgB, "Other Org");

    const { error: saErr } = await admin
      .from("staff_assignment")
      .insert({ property_id: propAssigned, staff_user_id: staffA.id });
    if (saErr) throw saErr;
  }, 30_000);

  afterAll(async () => {
    // Orgs cascade to memberships/properties/turnovers/photos/issue_tags; deleting
    // the auth user cascades to its profile. Defensive: never let one failure
    // abort the rest, and surface any cleanup errors instead of leaking silently.
    const errors: string[] = [];
    for (const id of createdOrgIds) {
      const { error } = await admin.from("org").delete().eq("id", id);
      if (error) errors.push(`org ${id}: ${error.message}`);
    }
    for (const id of createdUserIds) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) errors.push(`user ${id}: ${error.message}`);
    }
    if (errors.length) console.warn("RLS test cleanup issues:", errors.join("; "));
  });

  it("operator sees every property in their org and none from another org", async () => {
    const { data, error } = await operatorA.client
      .from("property")
      .select("id, org_id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((p) => p.id);
    expect(ids).toContain(propAssigned);
    expect(ids).toContain(propUnassigned);
    expect(ids).not.toContain(propB);
    expect((data ?? []).every((p) => p.org_id === orgA)).toBe(true);
  });

  it("staff sees ONLY assigned properties, not other org-A properties", async () => {
    const { data, error } = await staffA.client.from("property").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((p) => p.id);
    // Anchor the negative assertions to a non-empty, correctly-scoped result:
    // exactly one visible property, and it is the assigned one.
    expect(ids).toHaveLength(1);
    expect(ids).toContain(propAssigned);
    expect(ids).not.toContain(propUnassigned);
    expect(ids).not.toContain(propB);
  });

  it("cross-org filter: operator A reads their own property but not org B's", async () => {
    // Positive control — proves the client can see SOMETHING (not a blind/empty
    // or no-JWT client), so the empty org-B result below is due to RLS.
    const { data: mine } = await operatorA.client
      .from("property")
      .select("id")
      .eq("id", propAssigned);
    expect((mine ?? []).map((p) => p.id)).toEqual([propAssigned]);

    const { data: theirs, error } = await operatorA.client
      .from("property")
      .select("id")
      .eq("id", propB);
    expect(error).toBeNull();
    expect(theirs ?? []).toHaveLength(0);
  });

  it("turnover children are immutable once the turnover is locked", async () => {
    // Draft turnover on an assigned property, submitted by operator A.
    const { data: to, error: toErr } = await admin
      .from("turnover")
      .insert({ property_id: propAssigned, submitter_id: operatorA.id, status: "draft" })
      .select("id")
      .single();
    if (toErr || !to) throw toErr ?? new Error("turnover insert failed");

    // While draft, the operator may add an issue tag (positive control).
    const { data: tag, error: tagErr } = await operatorA.client
      .from("issue_tag")
      .insert({ turnover_id: to.id, tag: "scale", source: "human" })
      .select("id")
      .single();
    expect(tagErr).toBeNull();
    expect(tag).not.toBeNull();

    // Lock it (draft -> submitted_locked is the one allowed transition).
    const { error: lockErr } = await admin
      .from("turnover")
      .update({ status: "submitted_locked" })
      .eq("id", to.id);
    expect(lockErr).toBeNull();

    // Now the operator must NOT be able to add new evidence to the locked turnover.
    const { error: lockedTagErr } = await operatorA.client
      .from("issue_tag")
      .insert({ turnover_id: to.id, tag: "tampered", source: "human" });
    expect(lockedTagErr).not.toBeNull();

    const { error: lockedPhotoErr } = await operatorA.client
      .from("photo")
      .insert({ turnover_id: to.id, slot: "wide" });
    expect(lockedPhotoErr).not.toBeNull();

    // ...nor delete an existing tag (USING denies -> 0 rows; the tag survives).
    await operatorA.client.from("issue_tag").delete().eq("id", tag!.id);
    const { count } = await admin
      .from("issue_tag")
      .select("id", { count: "exact", head: true })
      .eq("id", tag!.id);
    expect(count).toBe(1);
  }, 30_000);

  it("forces submitter_id and submitted_at_server to the acting user", async () => {
    // Operator A tries to attribute a turnover to staff A AND backdate the server
    // clock; the trigger must overwrite both with the real actor and real now().
    const backdated = "2020-01-01T00:00:00.000Z";
    const { data, error } = await operatorA.client
      .from("turnover")
      .insert({
        property_id: propAssigned,
        submitter_id: staffA.id,
        submitted_at_server: backdated,
        status: "draft",
      })
      .select("submitter_id, submitted_at_server")
      .single();
    expect(error).toBeNull();
    expect(data?.submitter_id).toBe(operatorA.id);
    expect(data?.submitter_id).not.toBe(staffA.id);
    expect(new Date(data!.submitted_at_server).getTime()).toBeGreaterThan(
      Date.now() - 60_000,
    );
  });

  it("blocks an authenticated non-member from creating a turnover", async () => {
    // Operator B belongs to org B only — cannot capture an org A property.
    const { error } = await operatorB.client.from("turnover").insert({
      property_id: propAssigned,
      submitter_id: operatorB.id,
      status: "draft",
    });
    expect(error).not.toBeNull();
  });

  it("lets staff capture their assigned property but not an unassigned one", async () => {
    // Positive control: the assigned property accepts the capture...
    const { error: okErr } = await staffA.client.from("turnover").insert({
      property_id: propAssigned,
      submitter_id: staffA.id,
      status: "draft",
    });
    expect(okErr).toBeNull();
    // ...the unassigned org-A property does not.
    const { error: denyErr } = await staffA.client.from("turnover").insert({
      property_id: propUnassigned,
      submitter_id: staffA.id,
      status: "draft",
    });
    expect(denyErr).not.toBeNull();
  });

  it("blocks an operator from creating a property in another org", async () => {
    const { error } = await operatorB.client
      .from("property")
      .insert({ org_id: orgA, name: "Org B land-grab" });
    expect(error).not.toBeNull();
  });

  it("forbids an operator from self-serving a plan / billing change", async () => {
    const { error } = await operatorA.client
      .from("org")
      .update({ plan: "enterprise" })
      .eq("id", orgA);
    expect(error).not.toBeNull();
    // The plan is unchanged when an admin reads it back.
    const { data } = await admin
      .from("org")
      .select("plan")
      .eq("id", orgA)
      .single();
    expect(data?.plan).not.toBe("enterprise");
    // ...but a non-billing field (name) remains editable by the operator.
    const { error: nameErr } = await operatorA.client
      .from("org")
      .update({ name: "Org A (renamed)" })
      .eq("id", orgA);
    expect(nameErr).toBeNull();
  });

  it("records evidence writes in an append-only audit log", async () => {
    // A capture writes exactly one audit row, attributed to the actor.
    const { data: to, error: toErr } = await operatorA.client
      .from("turnover")
      .insert({ property_id: propAssigned, submitter_id: operatorA.id, status: "draft" })
      .select("id")
      .single();
    expect(toErr).toBeNull();

    const { data: rows, error: auditErr } = await admin
      .from("audit_log")
      .select("id, entity, action, actor_id, org_id")
      .eq("entity", "turnover")
      .eq("entity_id", to!.id);
    expect(auditErr).toBeNull();
    expect(rows).toHaveLength(1);
    const auditRow = rows![0];
    expect(auditRow).toMatchObject({
      entity: "turnover",
      action: "INSERT",
      actor_id: operatorA.id,
      org_id: orgA,
    });

    // The operator has SELECT but no UPDATE policy: the tamper is a silent no-op.
    await operatorA.client
      .from("audit_log")
      .update({ action: "TAMPERED" })
      .eq("id", auditRow.id);
    // Even a service-role UPDATE is rejected by the append-only guard trigger.
    const { error: tamperErr } = await admin
      .from("audit_log")
      .update({ action: "TAMPERED" })
      .eq("id", auditRow.id);
    expect(tamperErr).not.toBeNull();

    const { data: after } = await admin
      .from("audit_log")
      .select("action")
      .eq("id", auditRow.id)
      .single();
    expect(after?.action).toBe("INSERT");
  }, 30_000);

  it("a member can read co-members' profiles but not users from another org (#98)", async () => {
    // operatorA and staffA share org A — the Team page needs co-member names.
    const { data: coMember } = await operatorA.client
      .from("profile")
      .select("id, email")
      .eq("id", staffA.id)
      .single();
    expect(coMember?.id).toBe(staffA.id);

    // operatorB belongs to org B only — invisible to operatorA.
    const { data: outsider } = await operatorA.client
      .from("profile")
      .select("id")
      .eq("id", operatorB.id);
    expect(outsider ?? []).toHaveLength(0);

    // Self is always readable (profile_self_select).
    const { data: self } = await operatorA.client
      .from("profile")
      .select("id")
      .eq("id", operatorA.id)
      .single();
    expect(self?.id).toBe(operatorA.id);
  });

  // ── Anon proof link access ─────────────────────────────────────────────────
  describe("Proof link — anon access", () => {
    const anonClient = ready
      ? createClient<Database>(url!, anon!, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : (null as unknown as ReturnType<typeof createClient<Database>>);

    let proofOrgId: string;
    let proofTurnoverLockedId: string;
    let proofShareToken: string;
    let proofTurnoverDraftId: string;
    let proofPhotoId: string;
    let proofOperator: AuthedUser;

    beforeAll(async () => {
      const { data: org } = await admin
        .from("org")
        .insert({ name: "RLS Proof Org" })
        .select("id")
        .single();
      proofOrgId = org!.id;
      createdOrgIds.push(proofOrgId);

      proofOperator = await makeUser("proofop");
      await admin
        .from("membership")
        .insert({ user_id: proofOperator.id, org_id: proofOrgId, role: "operator" });

      const { data: prop } = await admin
        .from("property")
        .insert({ org_id: proofOrgId, name: "Proof Test Property" })
        .select("id")
        .single();

      proofShareToken = randomUUID();
      const { data: locked } = await admin
        .from("turnover")
        .insert({
          property_id: prop!.id,
          submitter_id: proofOperator.id,
          status: "submitted_locked",
          share_token: proofShareToken,
          urgent: false,
          notes: "",
        })
        .select("id")
        .single();
      proofTurnoverLockedId = locked!.id;

      const { data: ph } = await admin
        .from("photo")
        .insert({ turnover_id: proofTurnoverLockedId, slot: "wide" })
        .select("id")
        .single();
      proofPhotoId = ph!.id;

      await admin
        .from("issue_tag")
        .insert({ turnover_id: proofTurnoverLockedId, tag: "foam", source: "human" });

      const { data: draft } = await admin
        .from("turnover")
        .insert({
          property_id: prop!.id,
          submitter_id: proofOperator.id,
          status: "draft",
          share_token: null,
          urgent: false,
          notes: "",
        })
        .select("id")
        .single();
      proofTurnoverDraftId = draft!.id;
    });

    it("anon can read a locked turnover via its share_token", async () => {
      const { data, error } = await anonClient
        .from("turnover")
        .select("id, share_token, status")
        .eq("share_token", proofShareToken)
        .single();
      expect(error).toBeNull();
      expect(data?.id).toBe(proofTurnoverLockedId);
      expect(data?.status).toBe("submitted_locked");
    });

    it("anon cannot read a draft turnover (no share_token)", async () => {
      const { data } = await anonClient
        .from("turnover")
        .select("id")
        .eq("id", proofTurnoverDraftId);
      expect(data).toHaveLength(0);
    });

    it("anon can read photos of a locked shared turnover", async () => {
      const { data, error } = await anonClient
        .from("photo")
        .select("id")
        .eq("turnover_id", proofTurnoverLockedId);
      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
      expect(data?.[0].id).toBe(proofPhotoId);
    });

    it("anon cannot read photos of a draft/non-shared turnover", async () => {
      const { data } = await anonClient
        .from("photo")
        .select("id")
        .eq("turnover_id", proofTurnoverDraftId);
      expect(data).toHaveLength(0);
    });

    it("anon can read issue tags of a locked shared turnover", async () => {
      const { data, error } = await anonClient
        .from("issue_tag")
        .select("tag")
        .eq("turnover_id", proofTurnoverLockedId);
      expect(error).toBeNull();
      expect(data?.map((i) => i.tag)).toContain("foam");
    });

    it("anon cannot read issue tags of a draft/non-shared turnover", async () => {
      const { data } = await anonClient
        .from("issue_tag")
        .select("tag")
        .eq("turnover_id", proofTurnoverDraftId);
      expect(data).toHaveLength(0);
    });

    // ── proof_event: share/open tracking (PRD §16 wedge signal) ─────────────
    describe("proof_event", () => {
      it("org member can insert share_copied as themselves on a locked turnover", async () => {
        const { error } = await proofOperator.client.from("proof_event").insert({
          turnover_id: proofTurnoverLockedId,
          kind: "share_copied",
          actor_user_id: proofOperator.id,
        });
        expect(error).toBeNull();
      });

      it("cannot insert link_opened directly or attribute a share to someone else", async () => {
        const direct = await proofOperator.client.from("proof_event").insert({
          turnover_id: proofTurnoverLockedId,
          kind: "link_opened",
          actor_user_id: proofOperator.id,
        });
        expect(direct.error).not.toBeNull();

        const spoofed = await proofOperator.client.from("proof_event").insert({
          turnover_id: proofTurnoverLockedId,
          kind: "share_copied",
          actor_user_id: operatorB.id,
        });
        expect(spoofed.error).not.toBeNull();
      });

      it("other orgs and anon cannot read events; append-only (delete blocked)", async () => {
        const otherOrg = await operatorB.client.from("proof_event").select("id");
        expect(otherOrg.data).toEqual([]);

        const anonRead = await anonClient.from("proof_event").select("id");
        expect(anonRead.data ?? []).toEqual([]);

        await proofOperator.client
          .from("proof_event")
          .delete()
          .eq("turnover_id", proofTurnoverLockedId);
        const after = await admin
          .from("proof_event")
          .select("id")
          .eq("turnover_id", proofTurnoverLockedId);
        expect((after.data ?? []).length).toBeGreaterThan(0);
      });

      it("anon record_proof_open records for a valid token and no-ops for a bad one", async () => {
        const ok = await anonClient.rpc("record_proof_open", {
          p_share_token: proofShareToken,
        });
        expect(ok.error).toBeNull();

        const bad = await anonClient.rpc("record_proof_open", {
          p_share_token: "not-a-real-token",
        });
        expect(bad.error).toBeNull();

        const rows = await admin
          .from("proof_event")
          .select("kind")
          .eq("turnover_id", proofTurnoverLockedId);
        expect(rows.data!.filter((r) => r.kind === "link_opened")).toHaveLength(1);
      });

      it("founder_metrics is denied for normal users and anon", async () => {
        const denied = await proofOperator.client.rpc("founder_metrics");
        expect(denied.error).not.toBeNull();

        const anonDenied = await anonClient.rpc("founder_metrics");
        expect(anonDenied.error).not.toBeNull();
      });
    });
  });

  // ── Invite accept flow (issue #97) ─────────────────────────────────────────
  describe("Invite accept flow", () => {
    // Operators mint invites in the app via createInviteAction; here we insert
    // them directly as admin (RLS bypassed) to exercise the accept RPCs.
    async function makeInvite(opts: {
      role: "staff" | "owner";
      propertyIds: string[];
      expired?: boolean;
    }): Promise<string> {
      const token = randomUUID();
      const { error } = await admin.from("invite").insert({
        org_id: orgA,
        role: opts.role,
        property_ids: opts.propertyIds,
        token,
        invited_by: operatorA.id,
        email: null,
        ...(opts.expired
          ? { expires_at: new Date(Date.now() - 60_000).toISOString() }
          : {}),
      });
      if (error) throw error;
      return token;
    }

    it("an unaccepted invitee cannot see the org's properties", async () => {
      const invitee = await makeUser("invitee-pending");
      const { data } = await invitee.client
        .from("property")
        .select("id")
        .eq("id", propAssigned);
      expect(data ?? []).toHaveLength(0);
    });

    it("get_invite_preview returns a valid invite and null when expired", async () => {
      const token = await makeInvite({ role: "staff", propertyIds: [propAssigned] });
      const { data: preview } = await operatorA.client.rpc("get_invite_preview", {
        p_token: token,
      });
      expect(preview).not.toBeNull();
      expect((preview as { role: string }).role).toBe("staff");

      const expiredToken = await makeInvite({
        role: "staff",
        propertyIds: [propAssigned],
        expired: true,
      });
      const { data: none } = await operatorA.client.rpc("get_invite_preview", {
        p_token: expiredToken,
      });
      expect(none).toBeNull();
    });

    it("staff invitee: after accept, sees only assigned and captures only assigned", async () => {
      const invitee = await makeUser("invitee-staff");
      const token = await makeInvite({ role: "staff", propertyIds: [propAssigned] });

      const { error: acceptErr } = await invitee.client.rpc("accept_invite", {
        p_token: token,
      });
      expect(acceptErr).toBeNull();

      const { data: props } = await invitee.client.from("property").select("id");
      const ids = (props ?? []).map((p) => p.id);
      expect(ids).toContain(propAssigned);
      expect(ids).not.toContain(propUnassigned);

      const { data: canAssigned } = await invitee.client.rpc(
        "app_can_capture_property",
        { p_property: propAssigned },
      );
      expect(canAssigned).toBe(true);
      const { data: canUnassigned } = await invitee.client.rpc(
        "app_can_capture_property",
        { p_property: propUnassigned },
      );
      expect(canUnassigned).toBe(false);
    });

    it("owner invitee: after accept, sees the property but cannot capture", async () => {
      const invitee = await makeUser("invitee-owner");
      const token = await makeInvite({ role: "owner", propertyIds: [propAssigned] });

      const { error: acceptErr } = await invitee.client.rpc("accept_invite", {
        p_token: token,
      });
      expect(acceptErr).toBeNull();

      const { data: props } = await invitee.client.from("property").select("id");
      expect((props ?? []).map((p) => p.id)).toContain(propAssigned);

      const { data: canCap } = await invitee.client.rpc(
        "app_can_capture_property",
        { p_property: propAssigned },
      );
      expect(canCap).toBe(false);

      const { error: insErr } = await invitee.client.from("turnover").insert({
        property_id: propAssigned,
        submitter_id: invitee.id,
        status: "draft",
      });
      expect(insErr).not.toBeNull();
    });

    it("an expired token is rejected and creates no membership", async () => {
      const invitee = await makeUser("invitee-expired");
      const token = await makeInvite({
        role: "staff",
        propertyIds: [propAssigned],
        expired: true,
      });
      const { error } = await invitee.client.rpc("accept_invite", {
        p_token: token,
      });
      expect(error).not.toBeNull();

      const { data: m } = await admin
        .from("membership")
        .select("id")
        .eq("user_id", invitee.id)
        .eq("org_id", orgA);
      expect(m ?? []).toHaveLength(0);
    });

    it("a non-operator cannot create an invite (RLS blocks the insert)", async () => {
      const outsider = await makeUser("invite-outsider");
      const { error } = await outsider.client.from("invite").insert({
        org_id: orgA,
        role: "staff",
        property_ids: [propAssigned],
        token: randomUUID(),
        invited_by: outsider.id,
      });
      expect(error).not.toBeNull();
    });
  });

  // ── Water readings (issue #99) ─────────────────────────────────────────────
  describe("Water readings", () => {
    const anonClient = ready
      ? createClient<Database>(url!, anon!, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : (null as unknown as ReturnType<typeof createClient<Database>>);

    it("staff can add a reading to a draft turnover on an assigned property, not an unassigned one", async () => {
      const { data: to } = await staffA.client
        .from("turnover")
        .insert({ property_id: propAssigned, submitter_id: staffA.id, status: "draft" })
        .select("id")
        .single();
      const { error: okErr } = await staffA.client.from("water_reading").insert({
        turnover_id: to!.id,
        property_id: propAssigned,
        ph: 7.4,
        sanitizer_ppm: 4,
        temp_f: 100,
      });
      expect(okErr).toBeNull();

      // A draft turnover on the unassigned property (created by admin); staff
      // cannot attach a reading to it.
      const { data: toU } = await admin
        .from("turnover")
        .insert({ property_id: propUnassigned, submitter_id: operatorA.id, status: "draft" })
        .select("id")
        .single();
      const { error: denyErr } = await staffA.client.from("water_reading").insert({
        turnover_id: toU!.id,
        property_id: propUnassigned,
        ph: 7.4,
      });
      expect(denyErr).not.toBeNull();
    });

    it("a reading is immutable once the turnover is locked", async () => {
      const { data: to } = await admin
        .from("turnover")
        .insert({ property_id: propAssigned, submitter_id: operatorA.id, status: "draft" })
        .select("id")
        .single();
      const { data: r, error: insErr } = await operatorA.client
        .from("water_reading")
        .insert({ turnover_id: to!.id, property_id: propAssigned, ph: 7.5 })
        .select("id")
        .single();
      expect(insErr).toBeNull();

      await admin
        .from("turnover")
        .update({ status: "submitted_locked" })
        .eq("id", to!.id);

      // USING denies the update on a locked turnover → 0 rows; value unchanged.
      await operatorA.client
        .from("water_reading")
        .update({ ph: 9.9 })
        .eq("id", r!.id);
      const { data: after } = await admin
        .from("water_reading")
        .select("ph")
        .eq("id", r!.id)
        .single();
      expect(Number(after?.ph)).toBe(7.5);
    });

    it("anon reads a reading only through a locked + shared turnover", async () => {
      const token = randomUUID();
      const { data: shared } = await admin
        .from("turnover")
        .insert({
          property_id: propAssigned,
          submitter_id: operatorA.id,
          status: "submitted_locked",
          share_token: token,
        })
        .select("id")
        .single();
      await admin
        .from("water_reading")
        .insert({ turnover_id: shared!.id, property_id: propAssigned, ph: 7.6 });

      const { data: unshared } = await admin
        .from("turnover")
        .insert({
          property_id: propAssigned,
          submitter_id: operatorA.id,
          status: "submitted_locked",
          share_token: null,
        })
        .select("id")
        .single();
      await admin
        .from("water_reading")
        .insert({ turnover_id: unshared!.id, property_id: propAssigned, ph: 7.6 });

      const okRead = await anonClient
        .from("water_reading")
        .select("ph")
        .eq("turnover_id", shared!.id);
      expect((okRead.data ?? []).length).toBeGreaterThan(0);

      const denyRead = await anonClient
        .from("water_reading")
        .select("ph")
        .eq("turnover_id", unshared!.id);
      expect(denyRead.data ?? []).toHaveLength(0);
    });
  });

  // ── Chemistry trend visibility (issue #100) ────────────────────────────────
  describe("Chemistry trend visibility", () => {
    let readingAssignedId: string;
    let readingUnassignedId: string;

    beforeAll(async () => {
      const seed = async (prop: string): Promise<string> => {
        const { data: to } = await admin
          .from("turnover")
          .insert({
            property_id: prop,
            submitter_id: operatorA.id,
            status: "submitted_locked",
            share_token: randomUUID(),
          })
          .select("id")
          .single();
        const { data: r } = await admin
          .from("water_reading")
          .insert({ turnover_id: to!.id, property_id: prop, ph: 7.4, sanitizer_ppm: 4 })
          .select("id")
          .single();
        return r!.id;
      };
      readingAssignedId = await seed(propAssigned);
      readingUnassignedId = await seed(propUnassigned);
    });

    it("operator sees trend readings for every org property", async () => {
      const { data: a } = await operatorA.client
        .from("water_reading")
        .select("id")
        .eq("property_id", propAssigned);
      expect((a ?? []).map((r) => r.id)).toContain(readingAssignedId);
      const { data: u } = await operatorA.client
        .from("water_reading")
        .select("id")
        .eq("property_id", propUnassigned);
      expect((u ?? []).map((r) => r.id)).toContain(readingUnassignedId);
    });

    it("assigned staff sees trend readings only for assigned properties", async () => {
      const { data: ok } = await staffA.client
        .from("water_reading")
        .select("id")
        .eq("property_id", propAssigned);
      expect((ok ?? []).map((r) => r.id)).toContain(readingAssignedId);

      const { data: deny } = await staffA.client
        .from("water_reading")
        .select("id")
        .eq("property_id", propUnassigned);
      expect(deny ?? []).toHaveLength(0);
    });

    it("another org cannot read the readings", async () => {
      const { data } = await operatorB.client
        .from("water_reading")
        .select("id")
        .eq("property_id", propAssigned);
      expect(data ?? []).toHaveLength(0);
    });
  });

  // ── Host "turnover ready" notifications (issue #117) ───────────────────────
  describe("Turnover-ready notifications", () => {
    let ownerA: AuthedUser;

    beforeAll(async () => {
      // An org-A owner — should receive ready notifications alongside operators.
      ownerA = await makeUser("owner-a");
      const { error } = await admin
        .from("membership")
        .insert({ user_id: ownerA.id, org_id: orgA, role: "owner" });
      if (error) throw error;
    });

    it("notify_turnover_ready fans out to operators+owners, excluding the submitter and other orgs", async () => {
      // Staff A submits and locks a turnover on an org-A property.
      const { data: to } = await admin
        .from("turnover")
        .insert({
          property_id: propAssigned,
          submitter_id: staffA.id,
          status: "submitted_locked",
          share_token: randomUUID(),
        })
        .select("id")
        .single();

      // The submit action calls the RPC as the (authenticated) submitter.
      const { data: recipients, error } = await staffA.client.rpc(
        "notify_turnover_ready",
        { p_turnover_id: to!.id },
      );
      expect(error).toBeNull();
      // Fan-out reaches the org's operators+owners (>= operatorA and ownerA;
      // earlier invite-accept tests may have added more org-A members). The
      // per-recipient assertions below carry the isolation + exclusion proof.
      expect((recipients ?? []).length).toBeGreaterThanOrEqual(2);

      // operatorA sees ONLY their own notification for this turnover...
      const { data: opRows } = await operatorA.client
        .from("notification")
        .select("id, user_id, message")
        .eq("turnover_id", to!.id);
      expect(opRows).toHaveLength(1);
      expect(opRows![0].user_id).toBe(operatorA.id);
      expect(opRows![0].message).toContain("guest-ready");

      // ...ownerA likewise sees only their own...
      const { data: ownerRows } = await ownerA.client
        .from("notification")
        .select("id, user_id")
        .eq("turnover_id", to!.id);
      expect(ownerRows).toHaveLength(1);
      expect(ownerRows![0].user_id).toBe(ownerA.id);

      // ...the submitter (staffA) was excluded entirely...
      const { data: staffRows } = await staffA.client
        .from("notification")
        .select("id")
        .eq("turnover_id", to!.id);
      expect(staffRows ?? []).toHaveLength(0);

      // ...and a member of another org sees nothing.
      const { data: otherRows } = await operatorB.client
        .from("notification")
        .select("id")
        .eq("turnover_id", to!.id);
      expect(otherRows ?? []).toHaveLength(0);
    });

    it("a recipient can mark their own notification read but not someone else's", async () => {
      const { data: to } = await admin
        .from("turnover")
        .insert({
          property_id: propAssigned,
          submitter_id: staffA.id,
          status: "submitted_locked",
          share_token: randomUUID(),
        })
        .select("id")
        .single();
      await staffA.client.rpc("notify_turnover_ready", {
        p_turnover_id: to!.id,
      });

      const { data: mine } = await operatorA.client
        .from("notification")
        .select("id")
        .eq("turnover_id", to!.id)
        .single();

      // operatorA marks their own row read — succeeds.
      const { error: okErr } = await operatorA.client
        .from("notification")
        .update({ read_at: new Date().toISOString() })
        .eq("id", mine!.id);
      expect(okErr).toBeNull();

      const { data: ownerRow } = await ownerA.client
        .from("notification")
        .select("id")
        .eq("turnover_id", to!.id)
        .single();

      // operatorA tries to mark ownerA's row read — USING denies → 0 rows, stays unread.
      await operatorA.client
        .from("notification")
        .update({ read_at: new Date().toISOString() })
        .eq("id", ownerRow!.id);
      const { data: afterRow } = await admin
        .from("notification")
        .select("read_at")
        .eq("id", ownerRow!.id)
        .single();
      expect(afterRow?.read_at).toBeNull();
    });

    it("an outside-org caller cannot fan out notifications for another org's turnover", async () => {
      const { data: to } = await admin
        .from("turnover")
        .insert({
          property_id: propAssigned,
          submitter_id: staffA.id,
          status: "submitted_locked",
          share_token: randomUUID(),
        })
        .select("id")
        .single();

      // operatorB (org B only) invokes the definer RPC for an org-A turnover —
      // app_can_capture_property gates it, so no notifications are authored.
      const { data: recipients, error } = await operatorB.client.rpc(
        "notify_turnover_ready",
        { p_turnover_id: to!.id },
      );
      expect(error).toBeNull();
      expect(recipients ?? []).toHaveLength(0);
      const { count } = await admin
        .from("notification")
        .select("id", { count: "exact", head: true })
        .eq("turnover_id", to!.id);
      expect(count).toBe(0);
    });

    it("the fan-out is idempotent — a repeat call creates no duplicate rows", async () => {
      const { data: to } = await admin
        .from("turnover")
        .insert({
          property_id: propAssigned,
          submitter_id: staffA.id,
          status: "submitted_locked",
          share_token: randomUUID(),
        })
        .select("id")
        .single();

      await staffA.client.rpc("notify_turnover_ready", { p_turnover_id: to!.id });
      await staffA.client.rpc("notify_turnover_ready", { p_turnover_id: to!.id });

      // operatorA still has exactly one notification for this turnover.
      const { data: rows } = await operatorA.client
        .from("notification")
        .select("id")
        .eq("turnover_id", to!.id);
      expect(rows).toHaveLength(1);
    });

    it("a recipient cannot rewrite a non-read_at column on their own row", async () => {
      const { data: to } = await admin
        .from("turnover")
        .insert({
          property_id: propAssigned,
          submitter_id: staffA.id,
          status: "submitted_locked",
          share_token: randomUUID(),
        })
        .select("id")
        .single();
      await staffA.client.rpc("notify_turnover_ready", { p_turnover_id: to!.id });

      const { data: mine } = await operatorA.client
        .from("notification")
        .select("id, message")
        .eq("turnover_id", to!.id)
        .single();

      // Column-level privileges restrict UPDATE to read_at; rewriting `message`
      // is rejected (no privilege), so the original message survives.
      const { error: colErr } = await operatorA.client
        .from("notification")
        .update({ message: "tampered" })
        .eq("id", mine!.id);
      expect(colErr).not.toBeNull();
      const { data: after } = await admin
        .from("notification")
        .select("message")
        .eq("id", mine!.id)
        .single();
      expect(after?.message).toBe(mine!.message);
    });
  });
});
