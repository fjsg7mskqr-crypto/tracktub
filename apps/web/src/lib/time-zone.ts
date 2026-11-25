import { cookies } from "next/headers";
import { TIME_ZONE_COOKIE, isValidTimeZone, resolveTimeZone } from "@/lib/time";

/**
 * The request's time zone: the device's, from the `tt_tz` cookie that
 * TimeZoneSync sets. Missing or not a real IANA zone → America/Detroit.
 * Reading cookies makes the caller dynamic (what the nonce CSP needs anyway).
 */
export async function getTimeZone(): Promise<string> {
  return resolveTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value);
}

/** The device's zone, or null when it hasn't reported one. For recording where
 *  a visit happened: a guessed Detroit would be a false record. */
export async function getDeviceTimeZone(): Promise<string | null> {
  const value = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  return isValidTimeZone(value) ? value : null;
}
