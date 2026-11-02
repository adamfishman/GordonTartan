// Admin-only access for write endpoints. The token lives in the ADMIN_TOKEN Worker
// secret (`wrangler secret put ADMIN_TOKEN`; `.dev.vars` locally). If the secret
// isn't set, every request is refused, so a missing secret can't open writes up.

export function isAuthorized(
  request: Request,
  adminToken: string | undefined
): boolean {
  if (!adminToken) return false
  const header = request.headers.get("Authorization") ?? ""
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match) return false
  return timingSafeEqual(match[1].trim(), adminToken)
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  let diff = x.length ^ y.length
  const len = Math.max(x.length, y.length)
  for (let i = 0; i < len; i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  }
  return diff === 0
}
