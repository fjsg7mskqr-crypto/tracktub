import type { DB, Photo, PhotoSlot, Turnover } from "./types";
import { PHOTO_SLOTS } from "./types";

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}
function daysAgo(d: number): string {
  return hoursAgo(d * 24);
}

function photos(
  capturedIso: string,
  opts: { confirmed?: Partial<Record<PhotoSlot, string[]>>; suggested?: Partial<Record<PhotoSlot, string[]>> } = {}
): Photo[] {
  return PHOTO_SLOTS.map(({ slot }) => ({
    slot,
    dataUrl: null,
    capturedAt: capturedIso,
    suggestedTags: (opts.suggested?.[slot] ?? []) as Photo["suggestedTags"],
    confirmedTags: (opts.confirmed?.[slot] ?? []) as Photo["confirmedTags"],
  }));
}

export function seedDB(): DB {
  const users: DB["users"] = [
    { id: "u_op", name: "You — Operator", role: "operator" },
    { id: "u_maria", name: "Maria — Cleaner", role: "staff" },
    { id: "u_devon", name: "Devon — Cleaner", role: "staff" },
    { id: "u_pat", name: "Pat — Owner", role: "owner" },
  ];

  const properties: DB["properties"] = [
    {
      id: "p_ridge",
      name: "Ridgeline A-Frame",
      address: "118 Summit Trail, Big Bear, CA",
      lat: 34.2439,
      lng: -116.9114,
      geofenceRadiusM: 150,
      tubNotes: "6-person saltwater. Cover latch sticks in cold.",
      ownerId: "u_pat",
      staffIds: ["u_maria"],
      staysSinceTurnover: 3,
    },
    {
      id: "p_lake",
      name: "Lakeview Cabin 4",
      address: "44 Marina Way, Big Bear Lake, CA",
      lat: 34.2401,
      lng: -116.8888,
      geofenceRadiusM: 150,
      tubNotes: "Bromine. Filter due monthly.",
      ownerId: "u_pat",
      staffIds: ["u_devon"],
      staysSinceTurnover: 0,
    },
    {
      id: "p_pine",
      name: "Pinecrest Chalet",
      address: "9 Tamarack Rd, Sugarloaf, CA",
      lat: 34.2356,
      lng: -116.8203,
      geofenceRadiusM: 150,
      tubNotes: "Older panel — occasional FLO error.",
      ownerId: "u_pat",
      staffIds: ["u_maria"],
      staysSinceTurnover: 1,
    },
  ];

  const turnovers: Turnover[] = [
    // Ridgeline — recent, clean, shared + opened (the happy path / wedge proof)
    {
      id: "t_ridge_1",
      propertyId: "p_ridge",
      submitterId: "u_maria",
      submittedAtServer: hoursAgo(20),
      status: "locked",
      urgent: false,
      notes: "All good. Cover latch a little stiff but closed fine.",
      photos: photos(hoursAgo(20)),
      shareToken: "ridge1aa2bb",
      shares: [
        { sharedAt: hoursAgo(19), channel: "Owner email", opens: [{ at: hoursAgo(18) }] },
      ],
    },
    // Pinecrest — cloudy water + panel error, URGENT, not shared yet
    {
      id: "t_pine_1",
      propertyId: "p_pine",
      submitterId: "u_maria",
      submittedAtServer: hoursAgo(5),
      status: "locked",
      urgent: true,
      notes: "Water looked cloudy and panel showing FLO. Flagged before check-in.",
      photos: photos(hoursAgo(5), {
        confirmed: { waterline: ["water_cloudy"], panel: ["panel_error"] },
        suggested: { waterline: ["low_sanitizer"] },
      }),
      shareToken: "pine1cc3dd",
      shares: [],
    },
    // Lakeview — clean, shared to guest (Airbnb), opened twice
    {
      id: "t_lake_1",
      propertyId: "p_lake",
      submitterId: "u_devon",
      submittedAtServer: hoursAgo(2),
      status: "locked",
      urgent: false,
      notes: "Spotless. Guest complained last week — proof sent proactively.",
      photos: photos(hoursAgo(2)),
      shareToken: "lake1ee4ff",
      shares: [
        {
          sharedAt: hoursAgo(2),
          channel: "Guest / Airbnb",
          opens: [{ at: hoursAgo(1) }, { at: hoursAgo(1) }],
        },
      ],
    },
    // Ridgeline — older history (last week), minor debris, shared
    {
      id: "t_ridge_0",
      propertyId: "p_ridge",
      submitterId: "u_maria",
      submittedAtServer: daysAgo(6),
      status: "locked",
      urgent: false,
      notes: "Skimmed leaves off the cover.",
      photos: photos(daysAgo(6), { confirmed: { cover: ["debris"] } }),
      shareToken: "ridge0gg5hh",
      shares: [{ sharedAt: daysAgo(6), channel: "Owner email", opens: [] }],
    },
  ];

  return {
    orgName: "Cascade Stays",
    users,
    properties,
    turnovers,
    waitlist: [],
    currentUserId: "u_op",
  };
}
