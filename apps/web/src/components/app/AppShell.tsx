import { TabBar } from "@/components/app/TabBar";

/**
 * Signed-in app frame: the `.tt-app` token scope (app-tokens.css), the page,
 * then the fixed bottom tab bar. Content is padded so nothing hides behind the
 * bar or the device's safe-area inset.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
