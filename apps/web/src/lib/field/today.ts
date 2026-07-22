/**
 * Pure aggregation for the Today prep brief. Table-agnostic: the RSC maps the
 * real `turnover` rows (status `draft` | `submitted_locked`) onto this shape
 * before calling in, so this stays trivially unit-testable.
 */

export interface TodayCard {
  propertyId: string;
  propertyName: string;
  lastTurnoverAt: string | null; // ISO — newest non-draft, or null
  inProgressTurnoverId: string | null; // non-null ⇒ show "Resume"
}

export function buildTodayCards(input: {
  properties: { id: string; name: string }[];
  turnovers: {
    id: string;
    propertyId: string;
    status: "draft" | "locked" | "submitted";
    at: string;
  }[];
}): TodayCard[] {
  const { properties, turnovers } = input;

  return properties
    .map((property) => {
      const mine = turnovers.filter((t) => t.propertyId === property.id);

      const newestDraft = mine
        .filter((t) => t.status === "draft")
        .sort((a, b) => b.at.localeCompare(a.at))[0];

      const newestDone = mine
        .filter((t) => t.status !== "draft")
        .sort((a, b) => b.at.localeCompare(a.at))[0];

      return {
        propertyId: property.id,
        propertyName: property.name,
        lastTurnoverAt: newestDone?.at ?? null,
        inProgressTurnoverId: newestDraft?.id ?? null,
      };
    })
    .sort((a, b) => a.propertyName.localeCompare(b.propertyName));
}
