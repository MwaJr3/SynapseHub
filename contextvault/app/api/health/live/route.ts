export const dynamic = 'force-dynamic';

// Liveness deliberately avoids external dependencies; readiness is separate.
export async function GET() {
  return Response.json({ status: 'live' }, { headers: { 'Cache-Control': 'no-store' } });
}
