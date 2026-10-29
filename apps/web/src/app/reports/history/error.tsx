"use client";

import { AppError } from "@/components/app/AppError";

export default function HistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppError error={error} reset={reset} title="Report failed to load" />;
}
