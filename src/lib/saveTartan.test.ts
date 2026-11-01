// @vitest-environment happy-dom
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { saveTartan } from './saveTartan'

const input = { name: 'Mine', description: '', palette: 'R#FF0000', threadcount: 'R10', parent_slug: null }
const ok = () => new Response(JSON.stringify({ slug: 'mine' }), { status: 201 })
const unauthorized = () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
const authHeader = (call: number) =>
  (vi.mocked(fetch).mock.calls[call][1]?.headers as Record<string, string>).Authorization

describe('saveTartan', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('prompt', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('sends the stored token without prompting', async () => {
    localStorage.setItem('gt-admin-token', 'saved')
    vi.mocked(fetch).mockResolvedValue(ok())
    const res = await saveTartan(input)
    expect(res.status).toBe(201)
    expect(authHeader(0)).toBe('Bearer saved')
    expect(window.prompt).not.toHaveBeenCalled()
  })

  it('prompts for a token when none is stored and remembers it', async () => {
    vi.mocked(window.prompt).mockReturnValue(' typed ')
    vi.mocked(fetch).mockResolvedValue(ok())
    await saveTartan(input)
    expect(authHeader(0)).toBe('Bearer typed')
    expect(localStorage.getItem('gt-admin-token')).toBe('typed')
  })

  it('returns 401 without calling the API when the prompt is cancelled', async () => {
    vi.mocked(window.prompt).mockReturnValue(null)
    const res = await saveTartan(input)
    expect(res.status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('re-prompts once and retries when the stored token is rejected', async () => {
    localStorage.setItem('gt-admin-token', 'stale')
    vi.mocked(window.prompt).mockReturnValue('fresh')
    vi.mocked(fetch).mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(ok())
    const res = await saveTartan(input)
    expect(res.status).toBe(201)
    expect(authHeader(0)).toBe('Bearer stale')
    expect(authHeader(1)).toBe('Bearer fresh')
    expect(localStorage.getItem('gt-admin-token')).toBe('fresh')
  })
})
