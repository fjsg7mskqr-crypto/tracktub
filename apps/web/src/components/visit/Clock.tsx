"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** "9:42 AM" in the device's own time zone. */
export function clockText(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Oct 17" in the device's own time zone. */
export function dayText(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * A time rendered only on the client: the server's time zone isn't the
 * operator's, so the server pass renders nothing rather than a wrong time.
 */
export function Clock({
  iso,
  format = clockText,
}: {
  iso: string | Date;
  format?: (iso: string) => string;
}) {
  const onClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  if (!onClient) return null;
  return <>{format(typeof iso === "string" ? iso : iso.toISOString())}</>;
}
