import type { RecordRow } from "@/components/record/record-model";

/** The mockup visit (Record.dc.html): Cedar Cabin, Mon Oct 26 2026, Detroit time. */
export function mockupRow(overrides: Partial<RecordRow> = {}): RecordRow {
  return {
    id: "3f9a2c1e-7b44-4d1a-9e2b-0c5d6e7f8a9b",
    status: "submitted_locked",
    created_at: "2026-10-26T13:42:00Z",
    submitted_at_server: "2026-10-26T14:58:00Z",
    share_token: "7Kq2tok",
    notes: "Light foam on arrival, cleared after the filter clean.",
    cleaning_steps: ["filters_cleaned", "wiped"],
    owner_flag: null,
    property: {
      id: "prop-1",
      name: "Cedar Cabin",
      address: "12 Lake Rd",
      client: { name: "Lakeview Rentals" },
    },
    submitter: { full_name: "Ethan Novak", email: "ethan@example.com" },
    photos: [
      {
        slot: "cover",
        phase: "after",
        storage_path: "org/t/cover.jpg",
        captured_at: "2026-10-26T14:56:00Z",
        created_at: "2026-10-26T14:56:05Z",
      },
      {
        slot: "full_frame",
        phase: "before",
        storage_path: "org/t/before.jpg",
        captured_at: "2026-10-26T13:43:00Z",
        created_at: "2026-10-26T13:43:05Z",
      },
      {
        slot: "full_frame",
        phase: "after",
        storage_path: "org/t/after.jpg",
        captured_at: "2026-10-26T14:54:00Z",
        created_at: "2026-10-26T14:54:05Z",
      },
    ],
    water: {
      total_alkalinity: 90,
      ph: 8,
      calcium_hardness: 190,
      sanitizer_ppm: 0.5,
      left_total_alkalinity: 100,
      left_ph: 7.5,
      left_calcium_hardness: 190,
      left_sanitizer_ppm: 2.5,
      recorded_at: "2026-10-26T13:45:00Z",
      found_recorded_at: "2026-10-26T13:45:00Z",
      left_recorded_at: "2026-10-26T14:52:00Z",
      treatments: ["ph_down"],
      treatment_note: "pH down · 2 oz\nChlorine · 1.5 oz",
    },
    ...overrides,
  };
}

/** A locked visit where nothing was logged. */
export function emptyRow(): RecordRow {
  return mockupRow({
    notes: null,
    cleaning_steps: [],
    photos: [],
    water: null,
  });
}
