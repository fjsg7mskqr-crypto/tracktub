import type { DB, IssueTag, Property, Turnover, User } from "./types";

export function currentUser(db: DB): User {
  return db.users.find((u) => u.id === db.currentUserId) ?? db.users[0];
}

export function visibleProperties(db: DB): Property[] {
  const u = currentUser(db);
  if (u.role === "operator") return db.properties;
  if (u.role === "owner") return db.properties.filter((p) => p.ownerId === u.id);
  return db.properties.filter((p) => p.staffIds.includes(u.id)); // staff
}

export function canCapture(db: DB, pid: string): boolean {
  const u = currentUser(db);
  if (u.role === "operator") return true;
  if (u.role === "staff") {
    const p = db.properties.find((x) => x.id === pid);
    return !!p && p.staffIds.includes(u.id);
  }
  return false; // owners are read-only
}

export function lockedTurnovers(db: DB, pid: string): Turnover[] {
  return db.turnovers
    .filter((t) => t.propertyId === pid && t.status === "locked")
    .sort((a, b) =>
      (b.submittedAtServer ?? "").localeCompare(a.submittedAtServer ?? "")
    );
}

export function lastTurnover(db: DB, pid: string): Turnover | undefined {
  return lockedTurnovers(db, pid)[0];
}

export function issueTagsOf(t: Turnover): IssueTag[] {
  return t.photos.flatMap((p) => p.confirmedTags);
}

export function shareCount(t: Turnover): number {
  return t.shares.length;
}

export function openCount(t: Turnover): number {
  return t.shares.reduce((n, s) => n + s.opens.length, 0);
}

export function userName(db: DB, uid: string): string {
  return db.users.find((u) => u.id === uid)?.name ?? "Unknown";
}

export function propertyById(db: DB, pid: string): Property | undefined {
  return db.properties.find((p) => p.id === pid);
}

export function turnoverById(db: DB, tid: string): Turnover | undefined {
  return db.turnovers.find((t) => t.id === tid);
}

export function withinHours(iso: string | null, hours: number): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() <= hours * 3600_000;
}
