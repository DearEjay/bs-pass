Deno.serve(async (_req) => {
  return new Response(
    JSON.stringify({ ok: true, ts: new Date().toISOString() }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
