/**
 * The tracker script runs on third-party sites, so /collect is the only part of
 * the app that needs to be cross-origin. The previous deployment applied these
 * headers to every response via vercel.json; scoping them to the two collect
 * routes keeps the authenticated surface same-origin.
 */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function preflight() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function corsJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders,
  });
}
