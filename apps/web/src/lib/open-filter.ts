/**
 * Who must NOT count as "a person opened the report" (the Reports list's
 * "Opened"). Link-preview crawlers, email scanners and uptime bots fetch a
 * shared link without a person reading it; counting them would let a property
 * manager tell an owner "you opened it" when only a preview was fetched.
 *
 * Matched case-insensitively as substrings of the User-Agent. The short generic
 * tokens (`bot`, `spider`, `crawler`, `preview`) catch the long tail; the named
 * ones are listed for clarity and for UAs that carry none of the generic words.
 */
export const BOT_UA_PATTERNS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "Slackbot",
  "Slack-ImgProxy",
  "Discordbot",
  "WhatsApp",
  "TelegramBot",
  "LinkedInBot",
  "SkypeUriPreview",
  "Applebot",
  "Googlebot",
  "bingbot",
  "Embedly",
  "Pinterest",
  "redditbot",
  "Iframely",
  "preview",
  "crawler",
  "spider",
  "bot",
  "HeadlessChrome",
  "curl",
  "python-requests",
] as const;

/** True for an empty/missing UA or one matching {@link BOT_UA_PATTERNS}. */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  const s = (ua ?? "").trim().toLowerCase();
  if (!s) return true;
  return BOT_UA_PATTERNS.some((p) => s.includes(p.toLowerCase()));
}

/** True when the browser/proxy marked the request as a speculative prefetch
 *  (`Purpose: prefetch`, `Sec-Purpose: prefetch…`), not a person loading it. */
export function isPrefetch(headers: Headers): boolean {
  return ["purpose", "sec-purpose"].some((h) =>
    (headers.get(h) ?? "").toLowerCase().includes("prefetch")
  );
}

/** Share tokens are long unguessable strings; anything shorter can't be one. */
export const MIN_TOKEN_LENGTH = 16;
