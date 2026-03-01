import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted above imports by Vitest's transformer
vi.mock('../../lib/tartan', () => ({
  slugify: vi.fn(),
  countPattern: vi.fn(),
}))

vi.mock('../../lib/db', () => ({
  getTartanBySlug: vi.fn(),
  createTartan: vi.fn(),
}))

import { POST } from './tartans'
import { slugify, countPattern } from '../../lib/tartan'
import { getTartanBySlug, createTartan } from '../../lib/db'

const mockSlugify = vi.mocked(slugify)
const mockCountPattern = vi.mocked(countPattern)
const mockGetTartanBySlug = vi.mocked(getTartanBySlug)
const mockCreateTartan = vi.mocked(createTartan)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/tartans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeInvalidJsonRequest(): Request {
  return new Request('http://localhost/api/tartans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not valid json{{',
  })
}

const fakeLocals = { runtime: { env: { DB: {} } } } as any

function ctx(request: Request) {
  return { request, locals: fakeLocals } as any
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validBody = {
  name: 'My Tartan',
  palette: 'R#FF0000 G#00FF00',
  threadcount: 'R10 G10',
}

const createdTartan = {
  id: 1,
  name: 'My Tartan',
  slug: 'my-tartan',
  palette: 'R#FF0000 G#00FF00',
  threadcount: 'R10 G10',
  description: '',
  parent_slug: null,
  parent_id: null,
  is_official: false,
  ref_id: null,
  created_at: '2024-01-01T00:00:00Z',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/tartans', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Default happy-path behaviour
    mockSlugify.mockReturnValue('my-tartan')
    mockCountPattern.mockReturnValue([{ fill: '#FF0000', size: 40 }])
    mockGetTartanBySlug.mockResolvedValue(null) // base slug is free
    mockCreateTartan.mockResolvedValue(createdTartan)
  })

  // -------------------------------------------------------------------------
  // Input validation
  // -------------------------------------------------------------------------

  it('returns 400 for invalid JSON body', async () => {
    const res = await POST(ctx(makeInvalidJsonRequest()))
    expect(res.status).toBe(400)
    const body = await res.json() as any
    expect(body.error).toBe('Invalid JSON')
  })

  it('returns 400 when name is missing', async () => {
    const { name: _n, ...noName } = validBody
    const res = await POST(ctx(makeRequest(noName)))
    expect(res.status).toBe(400)
    const body = await res.json() as any
    expect(body.error).toContain('required')
  })

  it('returns 400 when palette is missing', async () => {
    const { palette: _p, ...noPalette } = validBody
    const res = await POST(ctx(makeRequest(noPalette)))
    expect(res.status).toBe(400)
  })

  it('returns 400 when threadcount is missing', async () => {
    const { threadcount: _t, ...noThread } = validBody
    const res = await POST(ctx(makeRequest(noThread)))
    expect(res.status).toBe(400)
  })

  it('returns 400 when countPattern returns an empty array (invalid combo)', async () => {
    mockCountPattern.mockReturnValue([])
    const res = await POST(ctx(makeRequest(validBody)))
    expect(res.status).toBe(400)
    const body = await res.json() as any
    expect(body.error).toBe('Invalid threadcount/palette combination')
  })

  it('returns 400 when countPattern throws (malformed format)', async () => {
    mockCountPattern.mockImplementation(() => { throw new Error('bad format') })
    const res = await POST(ctx(makeRequest(validBody)))
    expect(res.status).toBe(400)
    const body = await res.json() as any
    expect(body.error).toBe('Invalid threadcount/palette format')
  })

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('returns 201 with the created tartan on success', async () => {
    const res = await POST(ctx(makeRequest(validBody)))
    expect(res.status).toBe(201)
    const body = await res.json() as any
    expect(body.slug).toBe('my-tartan')
    expect(body.name).toBe('My Tartan')
  })

  it('calls slugify with the tartan name', async () => {
    await POST(ctx(makeRequest(validBody)))
    expect(mockSlugify).toHaveBeenCalledWith('My Tartan')
  })

  it('calls createTartan with the slugified slug', async () => {
    await POST(ctx(makeRequest(validBody)))
    expect(mockCreateTartan).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ slug: 'my-tartan', name: 'My Tartan' }),
    )
  })

  it('passes optional description and parent_slug to createTartan', async () => {
    const body = { ...validBody, description: 'A custom tartan', parent_slug: 'gordon' }
    mockGetTartanBySlug.mockImplementation(async (_db: any, slug: string) => {
      if (slug === 'gordon') {
        return { ...createdTartan, id: 42, slug: 'gordon', name: 'Gordon' } as any
      }
      return null
    })
    await POST(ctx(makeRequest(body)))
    expect(mockCreateTartan).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ description: 'A custom tartan', parent_slug: 'gordon', parent_id: 42 }),
    )
  })

  // -------------------------------------------------------------------------
  // Slug deduplication
  // -------------------------------------------------------------------------

  it('appends -2 when the base slug is already taken', async () => {
    mockGetTartanBySlug
      .mockResolvedValueOnce(createdTartan) // 'my-tartan' taken
      .mockResolvedValueOnce(null)          // 'my-tartan-2' free

    await POST(ctx(makeRequest(validBody)))

    expect(mockCreateTartan).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ slug: 'my-tartan-2' }),
    )
  })

  it('keeps incrementing the suffix until a free slug is found', async () => {
    mockGetTartanBySlug
      .mockResolvedValueOnce(createdTartan) // 'my-tartan' taken
      .mockResolvedValueOnce(createdTartan) // 'my-tartan-2' taken
      .mockResolvedValueOnce(createdTartan) // 'my-tartan-3' taken
      .mockResolvedValueOnce(null)          // 'my-tartan-4' free

    await POST(ctx(makeRequest(validBody)))

    expect(mockCreateTartan).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ slug: 'my-tartan-4' }),
    )
  })

  // -------------------------------------------------------------------------
  // Server error
  // -------------------------------------------------------------------------

  it('returns 500 when createTartan throws', async () => {
    mockCreateTartan.mockRejectedValue(new Error('DB write failed'))
    const res = await POST(ctx(makeRequest(validBody)))
    expect(res.status).toBe(500)
    const body = await res.json() as any
    expect(body.error).toBe('DB write failed')
  })
})
