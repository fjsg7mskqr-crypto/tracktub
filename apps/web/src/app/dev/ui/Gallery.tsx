"use client";

import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardLink,
  CopyField,
  Data,
  Dot,
  EmptyState,
  Input,
  KeyValue,
  Label,
  MemberRow,
  Modal,
  Mono,
  Note,
  SectionHead,
  SegmentedControl,
  Select,
  Skeleton,
  Textarea,
  Tile,
  Tiles,
  Toast,
} from "@/components/ui";

function Demo({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="stack" style={{ gap: 12 }}>
      <SectionHead>{title}</SectionHead>
      <Card>
        <div className="row wrap" style={{ gap: 12, alignItems: "flex-start" }}>
          {children}
        </div>
      </Card>
    </div>
  );
}

export function Gallery() {
  const [modalOpen, setModalOpen] = useState(false);
  const [role, setRole] = useState<"cleaner" | "viewer">("cleaner");
  const [showToast, setShowToast] = useState(false);

  return (
    <div className="stack">
      <div className="pagehead">
        <div className="crumb">Dev</div>
        <h1>UI gallery</h1>
        <p className="muted small">
          Every <Mono>components/ui</Mono> primitive and variant. Dev-only —
          this route 404s in production.
        </p>
      </div>

      <Demo title="Button">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="primary" icon="plus">
          With icon
        </Button>
        <Button size="sm">Small</Button>
        <Button disabled>Disabled</Button>
      </Demo>

      <Demo title="Badge & Dot">
        <Badge>Neutral</Badge>
        <Badge variant="ok">Verified</Badge>
        <Badge variant="brand">Cleaner</Badge>
        <Badge variant="warn">Pending</Badge>
        <Badge variant="danger">Urgent</Badge>
        <span className="row">
          <Dot tone="ok" /> ok
        </span>
        <span className="row">
          <Dot tone="warn" /> warn
        </span>
        <span className="row">
          <Dot tone="danger" /> danger
        </span>
      </Demo>

      <Demo title="Avatar">
        <Avatar name="Maria Lopez" size="sm" />
        <Avatar name="Maria Lopez" size="md" />
        <Avatar name="Maria Lopez" size="lg" />
        <Avatar name="ethan@nhs-llc.com" variant="blue" size="lg" />
      </Demo>

      <Demo title="Tile">
        <Tiles style={{ width: "100%" }}>
          <Tile label="Coverage" value="3 / 3" sub="All captured" />
          <Tile
            label="Turnovers this week"
            value="12"
            sub="9 by your cleaners"
          />
          <Tile label="Needs your eyes" value="1" sub="cloudy water flag" />
        </Tiles>
      </Demo>

      <Demo title="Card & CardLink">
        <Card style={{ flex: 1 }}>A plain padded card.</Card>
        <CardLink href="/dev/ui" style={{ flex: 1 }}>
          A hover-lift card link →
        </CardLink>
      </Demo>

      <Demo title="KeyValue">
        <KeyValue
          style={{ width: "100%" }}
          items={[
            { label: "Token", value: <Mono>a1b2c3d4</Mono> },
            { label: "Captured", value: <Data>2026-06-12 14:03</Data> },
            { label: "Property", value: "Lakeview Cabin" },
          ]}
        />
      </Demo>

      <Demo title="Inputs">
        <div className="stack" style={{ width: "100%", gap: 14 }}>
          <div>
            <Label htmlFor="g-name">Property name</Label>
            <Input id="g-name" placeholder="e.g. Aspen Ridge Cabin" />
          </div>
          <div>
            <Label htmlFor="g-role" eyebrow>
              Legacy eyebrow label
            </Label>
            <Select id="g-role" defaultValue="cleaner">
              <option value="cleaner">Cleaner</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="g-notes">Tub notes</Label>
            <Textarea id="g-notes" rows={3} placeholder="Model, quirks…" />
          </div>
        </div>
      </Demo>

      <Demo title="SegmentedControl">
        <SegmentedControl
          ariaLabel="Role"
          value={role}
          onChange={setRole}
          options={[
            { value: "cleaner", label: "Cleaner" },
            { value: "viewer", label: "Viewer" },
          ]}
        />
        <span className="muted small">selected: {role}</span>
      </Demo>

      <Demo title="CopyField">
        <CopyField value="https://tracktub.com/invite/a1b2c3d4-e5f6" />
      </Demo>

      <Demo title="MemberRow">
        <div className="stack" style={{ width: "100%", gap: 0 }}>
          <MemberRow
            name="You"
            subtitle="ethan@nhs-llc.com"
            avatarVariant="blue"
            badge={<Badge variant="brand">Host</Badge>}
          />
          <MemberRow
            name="Maria Lopez"
            subtitle="3 turnovers this week · Lakeview Cabin"
            badge={<Badge variant="brand">Cleaner</Badge>}
            actions={
              <Button size="sm" variant="ghost">
                Manage
              </Button>
            }
          />
          <MemberRow
            name="pending@example.com"
            subtitle="invited 2h ago"
            badge={<Badge variant="warn">Pending</Badge>}
            actions={
              <>
                <Button size="sm" variant="ghost">
                  Resend
                </Button>
                <Button size="sm" variant="ghost">
                  Revoke
                </Button>
              </>
            }
          />
        </div>
      </Demo>

      <Demo title="Note, EmptyState, Skeleton">
        <div className="stack" style={{ width: "100%", gap: 12 }}>
          <Note>
            Your <strong>Free plan</strong> includes 1 property.
          </Note>
          <Note variant="warn">Low sanitizer — re-shock before check-in.</Note>
          <EmptyState>No turnovers captured yet.</EmptyState>
          <Skeleton />
        </div>
      </Demo>

      <Demo title="Modal & Toast">
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>
        <Button onClick={() => setShowToast(true)}>Show toast</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Invite someone"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Generate link
              </Button>
            </>
          }
        >
          <div className="stack" style={{ gap: 14 }}>
            <SegmentedControl
              ariaLabel="Role"
              value={role}
              onChange={setRole}
              options={[
                { value: "cleaner", label: "Cleaner" },
                { value: "viewer", label: "Viewer" },
              ]}
            />
            <CopyField value="https://tracktub.com/invite/a1b2c3d4-e5f6" />
          </div>
        </Modal>
        {showToast ? (
          <Toast duration={1800} onDismiss={() => setShowToast(false)}>
            Link copied
          </Toast>
        ) : null}
      </Demo>
    </div>
  );
}
