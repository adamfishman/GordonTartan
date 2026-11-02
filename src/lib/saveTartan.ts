// Client-side helper for POST /api/tartans. Creating tartans is admin-only, so the
// request carries the admin token, kept in this browser's localStorage after the
// first prompt. A 401 clears the stored token and asks again once.

const TOKEN_KEY = "gt-admin-token"

export interface SaveTartanInput {
  name: string
  description: string
  palette: string
  threadcount: string
  parent_slug: string | null
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage unavailable (private mode etc.): the token just isn't remembered.
  }
}

function askForToken(): string | null {
  const token = window.prompt("Admin token required to save tartans:")?.trim()
  if (token) writeToken(token)
  return token || null
}

export async function saveTartan(input: SaveTartanInput): Promise<Response> {
  const send = (token: string | null) =>
    fetch("/api/tartans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
    })

  let token = readToken() ?? askForToken()
  if (!token) {
    return new Response(
      JSON.stringify({ error: "An admin token is required to save." }),
      { status: 401 }
    )
  }

  let res = await send(token)
  if (res.status === 401) {
    writeToken(null)
    token = askForToken()
    if (token) res = await send(token)
  }
  return res
}
