"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_TIME_ZONE, TIME_ZONE_COOKIE } from "@/lib/time";

const TimeZoneContext = createContext<string>(DEFAULT_TIME_ZONE);

/** The zone the server rendered this page in (the device's, from the cookie).
 *  Client components format times with it so they match the server HTML. */
export function useTimeZone(): string {
  return useContext(TimeZoneContext);
}

const YEAR_SECONDS = 60 * 60 * 24 * 365;

function readCookie(): string | null {
  const hit = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${TIME_ZONE_COOKIE}=`));
  return hit
    ? decodeURIComponent(hit.slice(TIME_ZONE_COOKIE.length + 1))
    : null;
}

/**
 * Tells the server which time zone this device is in: stores it in the
 * first-party `tt_tz` cookie, and re-renders the page once if the server drew
 * it in a different zone. Renders nothing.
 */
export function TimeZoneSync({ serverTz }: { serverTz: string }) {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true; // at most one refresh per mount: no reload loops
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!device) return;
    if (readCookie() !== device) {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(device)}; Path=/; Max-Age=${YEAR_SECONDS}; SameSite=Lax${secure}`;
    }
    // Refresh only when the cookie really stuck (cookies can be blocked) and
    // the server rendered with something else.
    if (readCookie() === device && device !== serverTz) router.refresh();
  }, [serverTz, router]);

  return null;
}

/** Provides the request's zone to client components and keeps the cookie in
 *  step with the device. */
export function TimeZoneProvider({
  tz,
  children,
}: {
  tz: string;
  children: React.ReactNode;
}) {
  return (
    <TimeZoneContext.Provider value={tz}>
      <TimeZoneSync serverTz={tz} />
      {children}
    </TimeZoneContext.Provider>
  );
}
