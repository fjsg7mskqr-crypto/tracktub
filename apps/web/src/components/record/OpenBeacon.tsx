"use client";

import { useEffect, useRef } from "react";

/**
 * Tells the server a person opened the shared report: once per page load, and
 * only while the page is visible (a background/prerendered tab waits until it
 * is shown). Link-preview crawlers and email scanners only GET the HTML and
 * don't run this, so they are never counted. Fire-and-forget: a failure must
 * never touch the page. It is a bundled client component (carries the CSP
 * nonce via Next's own scripts) and posts same-origin (`connect-src 'self'`).
 * `fetch` with `keepalive` rather than sendBeacon so BotID's fetch hook can
 * attach its challenge headers.
 */
export function OpenBeacon({ token }: { token: string }) {
  const sent = useRef(false);

  useEffect(() => {
    const send = () => {
      if (sent.current) return;
      sent.current = true;
      document.removeEventListener("visibilitychange", onChange);
      try {
        fetch(`/proof/${encodeURIComponent(token)}/open`, {
          method: "POST",
          keepalive: true,
          credentials: "same-origin",
        }).catch(() => {});
      } catch {
        /* non-critical */
      }
    };
    const onChange = () => {
      if (document.visibilityState === "visible") send();
    };
    if (document.visibilityState === "visible") send();
    else document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [token]);

  return null;
}
