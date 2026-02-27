import { describe, it, expect } from 'vitest'
import {
  getTartanBySlug,
  getTartansByLetter,
  getAdjacentTartans,
  getRandomOfficialSlug,
  createTartan,
  getLetterPageCount,
} from './db'

// ---------------------------------------------------------------------------
// Mock helper
// ---------------------------------------------------------------------------
// Builds a lightweight D1Database stand-in. `calls` is an ordered list of
// async factory functions; each one is consumed (in order) the next time
// first(), all(), or run() is invoked on any prepared statement.
//
// bind() returns the same statement object so that both
//   db.prepare(sql).first()          and
//   db.prepare(sql).bind(...).first()
// work correctly.
function makeDb(calls: Array<() => Promise<any>>): any {
  const queue = [...calls]

  const makeStatement = (): any => {
    const stmt: any = {
      bind: () => stmt,
      first: () => (queue.shift() ?? (() => Promise.resolve(null)))(),
      all: () => (queue.shift() ?? (() => Promise.resolve({ results: [] })))(),
      run: () => (queue.shift() ?? (() => Promise.resolve()))(),
    }
    return stmt
  }

  return {
    prepare: () => makeStatement(),
  }
}

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------
const baseTartan = {
  id: 1,
  name: 'Gordon',
  description: '',
  palette: 'G#005020 K#101010 W#E0E0E0 Y#C8A000',
  threadcount: 'G/36 K2 W4 K2 G/36',
  slug: 'gordon',
  parent_slug: null,
  parent_id: null,
  is_official: true,
  ref_id: 1,
  created_at: '2024-01-01T00:00:00Z',
}

// ---------------------------------------------------------------------------
// getTartanBySlug
// ---------------------------------------------------------------------------
describe('getTartanBySlug', () => {
  it('returns a tartan when the slug exists', async () => {
    const db = makeDb([async () => baseTartan])
    const result = await getTartanBySlug(db, 'gordon')
    expect(result).toEqual(baseTartan)
  })

  it('returns null when the slug does not exist', async () => {
    const db = makeDb([async () => null])
    const result = await getTartanBySlug(db, 'no-such-tartan')
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getTartansByLetter
// ---------------------------------------------------------------------------
describe('getTartansByLetter', () => {
  it('returns tartans and total for a given letter', async () => {
    const second = { ...baseTartan, id: 2, slug: 'gordon-modern' }
    const db = makeDb([
      async () => ({ total: 2 }),
      async () => ({ results: [baseTartan, second] }),
    ])
    const result = await getTartansByLetter(db, 'G')
    expect(result.total).toBe(2)
    expect(result.tartans).toHaveLength(2)
    expect(result.tartans[0].slug).toBe('gordon')
  })

  it('returns empty results when no tartans exist for the letter', async () => {
    const db = makeDb([
      async () => ({ total: 0 }),
      async () => ({ results: [] }),
    ])
    const result = await getTartansByLetter(db, 'X')
    expect(result.total).toBe(0)
    expect(result.tartans).toHaveLength(0)
  })

  it('defaults total to 0 when the count query returns null', async () => {
    const db = makeDb([
      async () => null,
      async () => ({ results: [] }),
    ])
    const result = await getTartansByLetter(db, 'Z')
    expect(result.total).toBe(0)
  })

  it('applies pagination via the page parameter', async () => {
    // page 2, pageSize 60 → offset 60; we just verify the db is called and
    // the results are passed through correctly
    const db = makeDb([
      async () => ({ total: 120 }),
      async () => ({ results: [baseTartan] }),
    ])
    const result = await getTartansByLetter(db, 'G', 2, 60)
    expect(result.total).toBe(120)
    expect(result.tartans).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// getAdjacentTartans
// ---------------------------------------------------------------------------
describe('getAdjacentTartans', () => {
  const prev = { slug: 'gordon', name: 'Gordon' }
  const next = { slug: 'gordon-red', name: 'Gordon Red' }

  it('returns both previous and next when both exist', async () => {
    const db = makeDb([async () => prev, async () => next])
    const result = await getAdjacentTartans(db, 'gordon-modern')
    expect(result.previous).toEqual(prev)
    expect(result.next).toEqual(next)
  })

  it('returns null for previous when the tartan is first alphabetically', async () => {
    const db = makeDb([async () => null, async () => next])
    const result = await getAdjacentTartans(db, 'aardvark')
    expect(result.previous).toBeNull()
    expect(result.next).toEqual(next)
  })

  it('returns null for next when the tartan is last alphabetically', async () => {
    const db = makeDb([async () => prev, async () => null])
    const result = await getAdjacentTartans(db, 'zz-last')
    expect(result.previous).toEqual(prev)
    expect(result.next).toBeNull()
  })

  it('returns null for both when the tartan is the only entry', async () => {
    const db = makeDb([async () => null, async () => null])
    const result = await getAdjacentTartans(db, 'only-tartan')
    expect(result.previous).toBeNull()
    expect(result.next).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getRandomOfficialSlug
// ---------------------------------------------------------------------------
describe('getRandomOfficialSlug', () => {
  it('returns a slug when an official tartan exists', async () => {
    const db = makeDb([async () => ({ slug: 'gordon' })])
    const result = await getRandomOfficialSlug(db)
    expect(result).toBe('gordon')
  })

  it('returns null when there are no official tartans', async () => {
    const db = makeDb([async () => null])
    const result = await getRandomOfficialSlug(db)
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// createTartan
// ---------------------------------------------------------------------------
describe('createTartan', () => {
  it('inserts a new tartan and returns the created record', async () => {
    const newTartan = { ...baseTartan, id: 99, name: 'My Custom', slug: 'my-custom', is_official: false }
    // Two DB calls: run() for INSERT, then first() via getTartanBySlug
    const db = makeDb([
      async () => {},         // INSERT → run()
      async () => newTartan,  // SELECT → first()
    ])
    const result = await createTartan(db, {
      name: 'My Custom',
      palette: baseTartan.palette,
      threadcount: baseTartan.threadcount,
      slug: 'my-custom',
    })
    expect(result).toEqual(newTartan)
    expect(result.slug).toBe('my-custom')
  })

  it('passes optional description and parent_slug to the database', async () => {
    const newTartan = { ...baseTartan, id: 100, slug: 'custom-child', parent_slug: 'gordon' }
    const db = makeDb([
      async () => {},
      async () => newTartan,
    ])
    const result = await createTartan(db, {
      name: 'Custom Child',
      description: 'A variant',
      palette: baseTartan.palette,
      threadcount: baseTartan.threadcount,
      slug: 'custom-child',
      parent_slug: 'gordon',
    })
    expect(result.parent_slug).toBe('gordon')
  })
})

// ---------------------------------------------------------------------------
// getLetterPageCount
// ---------------------------------------------------------------------------
describe('getLetterPageCount', () => {
  it('returns the ceiling of total divided by the default pageSize (60)', async () => {
    const db = makeDb([async () => ({ total: 125 })])
    const pages = await getLetterPageCount(db, 'G')
    expect(pages).toBe(3) // ceil(125 / 60)
  })

  it('returns 0 when no tartans exist for the letter', async () => {
    const db = makeDb([async () => ({ total: 0 })])
    const pages = await getLetterPageCount(db, 'X')
    expect(pages).toBe(0)
  })

  it('returns 1 when total exactly equals pageSize', async () => {
    const db = makeDb([async () => ({ total: 60 })])
    const pages = await getLetterPageCount(db, 'G')
    expect(pages).toBe(1)
  })

  it('respects a custom pageSize', async () => {
    const db = makeDb([async () => ({ total: 10 })])
    const pages = await getLetterPageCount(db, 'G', 3)
    expect(pages).toBe(4) // ceil(10 / 3)
  })

  it('defaults total to 0 when the count query returns null', async () => {
    const db = makeDb([async () => null])
    const pages = await getLetterPageCount(db, 'Z')
    expect(pages).toBe(0)
  })
})
