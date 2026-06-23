// Restrict CORS to the configured app origin.
// Wildcard (*) would let any site make credentialed requests to Edge Functions.
const origin = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:3000'

export const CORS = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
