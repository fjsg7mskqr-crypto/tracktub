"use client";

import { useEffect, useState } from "react";
import type { DB, IssueTag, Photo, PhotoSlot } from "./types";
import { seedDB } from "./seed";
import { id, shareToken } from "./format";

const KEY = "tracktub.v1";
const EVT = "tracktub:change";

/** Thrown when a write exceeds the localStorage budget (real photos are large).
 *  The capture wizard catches this to show "reset the demo" instead of failing. */
export class QuotaError extends Error {
  constructor() {
    super("Browser storage is full.");
    this.name = "QuotaError";
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" ||
      e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e.code === 22)
  );
}

function read(): DB {
  if (typeof window === "undefined") return seedDB();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seedDB();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as DB;
  } catch {
    const s = seedDB();
    localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }
}

function write(db: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    if (isQuotaError(e)) throw new QuotaError();
    throw e;
  }
  window.dispatchEvent(new Event(EVT));
}

export function mutate(fn: (db: DB) => void) {
  const db = read();
  fn(db);
  write(db);
}

export function resetDemo() {
  write(seedDB());
}

/** Reactive read hook. Returns null until mounted (render a skeleton). */
export function useDB(): DB | null {
  const [db, setDb] = useState<DB | null>(null);
  useEffect(() => {
    setDb(read());
    const h = () => setDb(read());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return db;
}

// ---------- mutations ----------

export function setCurrentUser(userId: string) {
  mutate((d) => {
    d.currentUserId = userId;
  });
}

export function createDraft(propertyId: string, submitterId: string): string {
  const tid = id("t");
  mutate((d) => {
    d.turnovers.unshift({
      id: tid,
      propertyId,
      submitterId,
      submittedAtServer: null,
      status: "draft",
      urgent: false,
      notes: "",
      photos: [],
      shareToken: shareToken(),
      shares: [],
    });
  });
  return tid;
}

/** Create a fully-submitted (locked) turnover in one step (used by the capture wizard). */
export function addTurnover(
  propertyId: string,
  submitterId: string,
  payload: { photos: Photo[]; notes: string; urgent: boolean }
): string {
  const tid = id("t");
  mutate((d) => {
    d.turnovers.unshift({
      id: tid,
      propertyId,
      submitterId,
      submittedAtServer: new Date().toISOString(),
      status: "locked",
      urgent: payload.urgent,
      notes: payload.notes,
      photos: payload.photos,
      shareToken: shareToken(),
      shares: [],
    });
    const p = d.properties.find((x) => x.id === propertyId);
    if (p) p.staysSinceTurnover = 0;
  });
  return tid;
}

export function submitTurnover(
  tid: string,
  payload: { photos: Photo[]; notes: string; urgent: boolean }
) {
  mutate((d) => {
    const t = d.turnovers.find((x) => x.id === tid);
    if (!t || t.status === "locked") return;
    t.photos = payload.photos;
    t.notes = payload.notes;
    t.urgent = payload.urgent;
    t.submittedAtServer = new Date().toISOString();
    t.status = "locked";
    const p = d.properties.find((x) => x.id === t.propertyId);
    if (p) p.staysSinceTurnover = 0;
  });
}

export function shareTurnover(tid: string, channel: string) {
  mutate((d) => {
    const t = d.turnovers.find((x) => x.id === tid);
    if (!t) return;
    t.shares.push({ sharedAt: new Date().toISOString(), channel, opens: [] });
  });
}

/** Recipient opened the public proof link (the wedge signal). */
export function recordOpen(token: string) {
  mutate((d) => {
    const t = d.turnovers.find((x) => x.shareToken === token);
    if (!t || t.shares.length === 0) return;
    t.shares[t.shares.length - 1].opens.push({ at: new Date().toISOString() });
  });
}

export function toggleConfirmedTag(
  tid: string,
  slot: PhotoSlot,
  tag: IssueTag
) {
  mutate((d) => {
    const t = d.turnovers.find((x) => x.id === tid);
    const ph = t?.photos.find((p) => p.slot === slot);
    if (!ph) return;
    ph.confirmedTags = ph.confirmedTags.includes(tag)
      ? ph.confirmedTags.filter((x) => x !== tag)
      : [...ph.confirmedTags, tag];
  });
}

export function addWaitlist(propertyName: string, note: string) {
  mutate((d) => {
    d.waitlist.unshift({ at: new Date().toISOString(), propertyName, note });
  });
}
