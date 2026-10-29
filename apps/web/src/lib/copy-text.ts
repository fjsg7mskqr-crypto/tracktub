/**
 * Copy without the Clipboard API, which is missing outside a secure context
 * (e.g. the phone hitting a LAN dev server over http). A temporary readonly
 * textarea + execCommand("copy") still works there, iOS Safari included.
 */
function legacyCopy(text: string): boolean {
  const el = document.createElement("textarea");
  el.value = text;
  el.readOnly = true;
  el.style.position = "fixed";
  el.style.top = "0";
  el.style.opacity = "0";
  document.body.appendChild(el);
  try {
    el.focus();
    el.select();
    el.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    el.remove();
  }
}

export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator.clipboard?.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy copy.
    }
  }
  return legacyCopy(text);
}
