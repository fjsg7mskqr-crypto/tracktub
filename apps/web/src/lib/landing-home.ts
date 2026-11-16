/** Forwarded request header telling the root layout that, for this visitor, `/`
 *  renders the public landing page (not the app home), so `Shell` must skip the
 *  app chrome. Set for the whole session (any path) so a soft navigation to `/`
 *  from a marketing page — which does not re-render the root layout — is right.
 *  Kept in its own module so the layout doesn't import the Supabase middleware. */
export const LANDING_HOME_HEADER = "x-tt-landing-home";
