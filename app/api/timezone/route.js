export async function GET(request) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return new Response(JSON.stringify({ timeZone }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
