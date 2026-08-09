import { clearSessionCookie } from "../../../../lib/auth";

export async function GET() {
  return new Response(null, {
    status: 302,
    headers: {
      location: "/",
      "set-cookie": await clearSessionCookie(),
    },
  });
}

export async function POST() {
  return Response.json(
    { ok: true },
    { headers: { "set-cookie": await clearSessionCookie() } },
  );
}
