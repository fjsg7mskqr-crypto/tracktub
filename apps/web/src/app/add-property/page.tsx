"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPropertyAction,
  joinPaidWaitlistAction,
} from "@/lib/actions/property";
import { track } from "@/lib/analytics";
import {
  Button,
  Card,
  Input,
  Label,
  Note,
  Select,
  Textarea,
} from "@/components/ui";
import {
  DEFAULT_SANITIZER_TYPE,
  SANITIZER_BANDS,
  type SanitizerType,
} from "@/lib/chemistry";

export default function AddProperty() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [tubNotes, setTubNotes] = useState("");
  const [sanitizerType, setSanitizerType] =
    useState<SanitizerType>(DEFAULT_SANITIZER_TYPE);
  const [error, setError] = useState<string | null>(null);
  const [showWtp, setShowWtp] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joining, startJoin] = useTransition();

  function handleSubmit() {
    if (!name.trim()) return;
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("address", address.trim());
    formData.append("tub_notes", tubNotes.trim());
    formData.append("sanitizer_type", sanitizerType);
    setError(null);
    startTransition(async () => {
      const result = await createPropertyAction(formData);
      if (result.ok) {
        track("property_created", { property_id: result.propertyId });
        router.push(`/p/${result.propertyId}`);
      } else if ("wtp" in result) {
        track("wtp_fake_door_viewed");
        setShowWtp(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (showWtp) {
    return (
      <div className="stack" style={{ maxWidth: 560 }}>
        <div className="crumb">
          <Link href="/">Dashboard</Link> / Add property
        </div>
        <h1>Add a 2nd property</h1>
        <Note>
          You&apos;re on the <strong>Free plan</strong> (1 property included).
          Additional properties are <strong>$12 / property / month</strong>.
        </Note>
        <Card className="stack">
          <p className="small" style={{ margin: 0 }}>
            Multi-property paid plan is coming. Join the waitlist and we&apos;ll
            reach out when it&apos;s available — at $12/mo per property.
          </p>
          <p className="tiny dim" style={{ margin: 0 }}>
            (PRD §12 WTP fake-door — this logs your intent. No charge, no card.)
          </p>
          {joined ? (
            <Note>
              You&apos;re on the list — we&apos;ll reach out when the paid plan
              is ready.
            </Note>
          ) : (
            <div className="row">
              <Button
                variant="primary"
                disabled={joining}
                onClick={() =>
                  startJoin(async () => {
                    const result = await joinPaidWaitlistAction();
                    if (result.ok) {
                      track("paid_waitlist_joined");
                      setJoined(true);
                    }
                  })
                }
              >
                {joining ? "Joining…" : "Join the paid waitlist"}
              </Button>
            </div>
          )}
          <div className="row">
            <Link href="/" className="btn">
              ← Back to Dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div className="crumb">
        <Link href="/">Dashboard</Link> / Add property
      </div>
      <h1>Add a property</h1>
      <Note>
        Your <strong>Free plan</strong> includes 1 property.
      </Note>

      <Card className="stack">
        <div>
          <Label eyebrow htmlFor="pn">
            Property name <span style={{ color: "var(--urgent)" }}>*</span>
          </Label>
          <Input
            id="pn"
            placeholder="e.g. Aspen Ridge Cabin"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label eyebrow htmlFor="addr">
            Address (optional)
          </Label>
          <Input
            id="addr"
            placeholder="123 Main St, Aspen CO"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <Label eyebrow htmlFor="sanitizer_type">
            Sanitizer type
          </Label>
          <Select
            id="sanitizer_type"
            value={sanitizerType}
            onChange={(e) =>
              setSanitizerType(e.target.value as SanitizerType)
            }
          >
            <option value="chlorine">
              Chlorine ({SANITIZER_BANDS.chlorine.min}–
              {SANITIZER_BANDS.chlorine.max} ppm)
            </option>
            <option value="bromine">
              Bromine ({SANITIZER_BANDS.bromine.min}–
              {SANITIZER_BANDS.bromine.max} ppm)
            </option>
          </Select>
          <div className="tiny dim" style={{ marginTop: 4 }}>
            Sets the target band the readings panel flags against.
          </div>
        </div>
        <div>
          <Label eyebrow htmlFor="notes">
            Tub notes (optional)
          </Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Model, quirks, recurring issues…"
            value={tubNotes}
            onChange={(e) => setTubNotes(e.target.value)}
          />
        </div>
        {error && (
          <p className="small" style={{ color: "var(--urgent)", margin: 0 }}>
            {error}
          </p>
        )}
        <Button
          variant="primary"
          block
          disabled={!name.trim() || isPending}
          onClick={handleSubmit}
        >
          {isPending ? "Creating…" : "Create property →"}
        </Button>
      </Card>
    </div>
  );
}
