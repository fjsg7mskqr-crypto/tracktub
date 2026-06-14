import { redirect } from "next/navigation";

// The chemistry view became the first section of the Operations hub (#149).
// Keep this route as a permanent redirect so old links/bookmarks survive.
export default function ChemistryRedirect() {
  redirect("/operations");
}
