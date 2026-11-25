import { TabBar } from "@/components/app/TabBar";
import { TimeZoneProvider } from "@/components/app/TimeZone";

/**
 * Signed-in app frame: the `.tt-app` token scope (app-tokens.css), the page,
 * then the fixed bottom tab bar. Content is padded so nothing hides behind the
 * bar or the device's safe-area inset.
 */
export function AppShell({
  children,
  tz,
}: {
  children: React.ReactNode;
  /** The device's time zone, resolved by the server (getTimeZone). */
  tz: string;
}) {
  return (
    <TimeZoneProvider tz={tz}>
      <div className="tt-app">
        <div
          style={{
            paddingBottom: "calc(72px + env(safe-area-inset-bottom))",
            minHeight: "100dvh",
          }}
        >
          {children}
        </div>
        <TabBar />
      </div>
    </TimeZoneProvider>
  );
}
