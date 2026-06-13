import { notFound } from "next/navigation";
import { Gallery } from "./Gallery";

export const metadata = { title: "UI gallery (dev)" };

// Dev-only component gallery. 404s in production so it never ships to users.
export default function UiGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Gallery />;
}
