"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  CopyField,
  Input,
  Label,
  Modal,
  Note,
  SegmentedControl,
} from "@/components/ui";
import { createInviteAction, type InviteRole } from "@/lib/actions/invite";

export interface PropertyOption {
  id: string;
  name: string;
}

export function InviteModal({ properties }: { properties: PropertyOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<InviteRole>("staff");
  const singleProperty = properties.length === 1;
  const [selected, setSelected] = useState<string[]>(
    singleProperty ? properties.map((p) => p.id) : []
  );
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setRole("staff");
    setSelected(singleProperty ? properties.map((p) => p.id) : []);
    setEmail("");
    setLink(null);
    setError(null);
  }

  function close() {
    setOpen(false);
    // Refresh so a freshly-generated pending invite shows in the People list.
    if (link) router.refresh();
    reset();
  }

  function toggle(id: string) {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  function generate() {
    setError(null);
    startTransition(async () => {
      const res = await createInviteAction({
        role,
        propertyIds: selected,
        email: email.trim() || null,
      });
      if (res.ok) {
        setLink(`${window.location.origin}/invite/${res.token}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>
        Invite someone
      </Button>
      <Modal
        open={open}
        onClose={close}
        title="Invite someone"
        footer={
          link ? (
            <Button variant="primary" onClick={close}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={generate}
                disabled={pending || selected.length === 0}
              >
                {pending ? "Generating…" : "Generate link"}
              </Button>
            </>
          )
        }
      >
        {link ? (
          <div className="stack" style={{ gap: 12 }}>
            <Note>
              Share this one-time link. They&apos;ll join as{" "}
              <strong>{role === "staff" ? "a cleaner" : "a viewer"}</strong>{" "}
              after signing in.
            </Note>
            <CopyField value={link} />
          </div>
        ) : (
          <div className="stack" style={{ gap: 16 }}>
            <div>
              <Label>Role</Label>
              <SegmentedControl
                ariaLabel="Role"
                value={role}
                onChange={setRole}
                options={[
                  { value: "staff", label: "Cleaner" },
                  { value: "owner", label: "Viewer" },
                ]}
              />
              <p className="tiny dim" style={{ margin: "6px 0 0" }}>
                {role === "staff"
                  ? "Captures turnovers on the tubs you choose."
                  : "Read-only access to proof for the properties you choose."}
              </p>
            </div>

            {!singleProperty && (
              <div>
                <Label>Properties</Label>
                <div className="stack" style={{ gap: 6 }}>
                  {properties.map((p) => (
                    <label
                      key={p.id}
                      className="row"
                      style={{ gap: 8, cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="invite-email">Email (optional)</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="cleaner@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="tiny dim" style={{ margin: "6px 0 0" }}>
                For your records — the link is what grants access.
              </p>
            </div>

            {error && (
              <p
                className="small"
                style={{ color: "var(--urgent)", margin: 0 }}
              >
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
