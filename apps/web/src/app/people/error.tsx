"use client";

import { AppError } from "@/components/app/AppError";

export default function PeopleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppError error={error} reset={reset} title="People failed to load" />;
}
