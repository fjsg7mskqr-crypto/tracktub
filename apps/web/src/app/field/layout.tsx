"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomTabBar, type FieldTab } from "@/components/field/BottomTabBar";

function activeTab(pathname: string | null): FieldTab {
  if (pathname?.startsWith("/field/tubs")) return "tubs";
  if (pathname?.startsWith("/field/history")) return "history";
  if (pathname?.startsWith("/field/more")) return "more";
  return "today";
}

/**
 * Mobile field shell. Wraps every /field/* page in the "Water" token scope and
 * pins the bottom-tab nav. Content gets bottom padding so nothing hides behind
 * the fixed bar (plus the device safe-area inset).
 */
export default function FieldLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="field-scope">
      <div
        style={{
          paddingBottom: "calc(72px + env(safe-area-inset-bottom))",
          minHeight: "100dvh",
        }}
      >
        {children}
      </div>
      <BottomTabBar active={activeTab(pathname)} />
    </div>
  );
}
