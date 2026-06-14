"use client";

import { useTransition } from "react";
import { Icon } from "@/components/Icon";
import { timeAgo } from "@/lib/format";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notification";

export interface FeedNotification {
  id: string;
  message: string;
  created_at: string;
}

export function NotificationFeed({ items }: { items: FeedNotification[] }) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  return (
    <div className="stack" style={{ gap: 8 }}>
      {items.length > 1 && (
        <div className="spread">
          <span className="small dim">
            {items.length} new update{items.length > 1 ? "s" : ""}
          </span>
          <button
            className="btn ghost sm"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void markAllNotificationsRead();
              })
            }
          >
            Mark all read
          </button>
        </div>
      )}
      {items.map((n) => (
        <div
          key={n.id}
          className="note spread"
          style={{ alignItems: "center" }}
        >
          <span className="row" style={{ gap: 8, alignItems: "center" }}>
            <span className="badge ok">●</span>
            <span>
              <strong>{n.message}</strong>{" "}
              <span className="small dim">· {timeAgo(n.created_at)}</span>
            </span>
          </span>
          <button
            className="btn ghost sm"
            aria-label="Mark read"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void markNotificationRead(n.id);
              })
            }
          >
            <Icon name="check" size={14} /> Mark read
          </button>
        </div>
      ))}
    </div>
  );
}
