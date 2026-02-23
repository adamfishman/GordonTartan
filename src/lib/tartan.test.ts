import { describe, it, expect } from 'vitest'
import {
  slugify,
  countPattern,
  hexToHue,
  sortPaletteColors,
  buildSvgString,
  svgToDataUri,
} from './tartan'

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------
describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('replaces & with -and-', () => {
    expect(slugify('Tartan & Tweed')).toBe('tartan-and-tweed')
  })

  it('strips parentheses and their contents cleanly', () => {
    expect(slugify('Abergavenny (Historic)')).toBe('abergavenny-historic')
  })

  it('converts accented characters to ASCII equivalents', () => {
    // õ is not in the character map and gets stripped; use ö which maps to o
    expect(slugify('àéîöü')).toBe('aeiou')
  })

  it('collapses multiple hyphens into one', () => {
    expect(slugify('A--B')).toBe('a-b')
  })

  it('removes leading and trailing hyphens', () => {
    expect(slugify('(Test)')).toBe('test')
  })

  it('handles a plain ASCII string unchanged', () => {
    expect(slugify('abcdef')).toBe('abcdef')
  })

  it('trims surrounding whitespace', () => {
    expect(slugify('  clan name  ')).toBe('clan-name')
  })

  it('handles names with numbers', () => {
    expect(slugify('Abel (2015)')).toBe('abel-2015')
  })

  it('returns an empty string for empty input', () => {
    expect(slugify('')).toBe('')
  })

  it('returns an empty string for whitespace-only input', () => {
    expect(slugify('   ')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// hexToHue
// ---------------------------------------------------------------------------
describe('hexToHue', () => {
  it('returns 0 for pure red', () => {
    expect(hexToHue('#FF0000')).toBe(0)
  })

  it('returns 120 for pure green', () => {
    expect(hexToHue('#00FF00')).toBe(120)
  })

  it('returns 240 for pure blue', () => {
    expect(hexToHue('#0000FF')).toBe(240)
  })

  it('returns 0 for black (no delta)', () => {
    expect(hexToHue('#000000')).toBe(0)
  })

  it('returns 0 for white (no delta)', () => {
    expect(hexToHue('#FFFFFF')).toBe(0)
  })

  it('handles 3-character shorthand hex (#F00 = red)', () => {
    expect(hexToHue('#F00')).toBe(0)
  })

  it('handles 3-character shorthand hex (#0F0 = green)', () => {
    expect(hexToHue('#0F0')).toBe(120)
  })

  it('returns a value in the range 0–359', () => {
    const hue = hexToHue('#8A2BE2') // blueviolet
    expect(hue).toBeGreaterThanOrEqual(0)
    expect(hue).toBeLessThan(360)
  })

  it('accepts lowercase hex letters', () => {
    expect(hexToHue('#ff0000')).toBe(0)
    expect(hexToHue('#00ff00')).toBe(120)
  })

  it('returns 60 for yellow (#FFFF00)', () => {
    expect(hexToHue('#FFFF00')).toBe(60)
  })

  it('returns 180 for cyan (#00FFFF)', () => {
    expect(hexToHue('#00FFFF')).toBe(180)
  })

  it('returns 300 for magenta (#FF00FF)', () => {
    expect(hexToHue('#FF00FF')).toBe(300)
  })
})

// ---------------------------------------------------------------------------
// sortPaletteColors
// ---------------------------------------------------------------------------
describe('sortPaletteColors', () => {
  it('returns colors sorted by hue ascending', () => {
    // Red (hue 0), Green (hue 120), Blue (hue 240)
    expect(sortPaletteColors('R#FF0000 G#00FF00 B#0000FF')).toEqual([
      '#FF0000',
      '#00FF00',
      '#0000FF',
    ])
  })

  it('sorts regardless of input order', () => {
    expect(sortPaletteColors('B#0000FF R#FF0000 G#00FF00')).toEqual([
      '#FF0000',
      '#00FF00',
      '#0000FF',
    ])
  })

  it('handles a single color', () => {
    expect(sortPaletteColors('R#FF0000')).toEqual(['#FF0000'])
  })

  it('returns both colors when two have the same hue (black and white both = 0)', () => {
    const result = sortPaletteColors('K#000000 W#FFFFFF')
    expect(result).toHaveLength(2)
    expect(result).toContain('#000000')
    expect(result).toContain('#FFFFFF')
  })
})

// ---------------------------------------------------------------------------
// countPattern
// ---------------------------------------------------------------------------
describe('countPattern', () => {
  const palette = 'R#FF0000 K#101010 W#FFFFFF'

  it('returns entries with correct fill and size for a non-symmetric pattern', () => {
    // 2-entry, non-symmetric, even total (10+2=12)
    const result = countPattern('R10 K2', palette)
    expect(result).toEqual([
      { fill: '#FF0000', size: 40 },
      { fill: '#101010', size: 8 },
    ])
  })

  it('accounts for middle entries being doubled in total (even total, no repeat)', () => {
    // R10 K2 W4: total = 1*10 + 2*2 + 1*4 = 18 (even), 3 entries returned
    const result = countPattern('R10 K2 W4', palette)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ fill: '#FF0000', size: 40 })
    expect(result[1]).toEqual({ fill: '#101010', size: 8 })
    expect(result[2]).toEqual({ fill: '#FFFFFF', size: 16 })
  })

  it('doubles the full sequence when the non-symmetric total is odd', () => {
    // R5 K2: total = 5+2=7 (odd) → result is doubled to [R, K, R]
    const result = countPattern('R5 K2', palette)
    expect(result).toHaveLength(3)
    expect(result[0].fill).toBe('#FF0000')
    expect(result[1].fill).toBe('#101010')
    expect(result[2].fill).toBe('#FF0000')
  })

  it('mirrors the pattern for a symmetric threadcount (pivot marked with /)', () => {
    // R/10 K2 W4: symmetric around R → [R, K, W, K]
    const result = countPattern('R/10 K2 W4', palette)
    expect(result).toHaveLength(4)
    expect(result[0].fill).toBe('#FF0000') // R
    expect(result[1].fill).toBe('#101010') // K
    expect(result[2].fill).toBe('#FFFFFF') // W
    expect(result[3].fill).toBe('#101010') // K (mirrored)
  })

  it('falls back to #000000 for a color code not present in the palette', () => {
    const result = countPattern('R10 X2', palette)
    const unknown = result.find((e) => e.size === 8)
    expect(unknown?.fill).toBe('#000000')
  })

  it('size is 4× the thread count', () => {
    const result = countPattern('R8 K3', palette)
    // First and last entries only add 1× to total, but size is always 4×count
    expect(result[0].size).toBe(32) // 4*8
    expect(result[1].size).toBe(12) // 4*3
  })

  it('handles a single-entry pattern with an even total', () => {
    const result = countPattern('R10', 'R#FF0000')
    expect(result).toEqual([{ fill: '#FF0000', size: 40 }])
  })

  it('does not treat a non-first pivot marker as symmetric', () => {
    // Only a leading pivot (e.g. 'R/10 ...') triggers symmetric mode.
    // A trailing pivot like 'K/4' is parsed normally and does not mirror.
    const result = countPattern('R10 K/4', 'R#FF0000 K#101010')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ fill: '#FF0000', size: 40 })
    expect(result[1]).toEqual({ fill: '#101010', size: 16 })
  })
})

// ---------------------------------------------------------------------------
// buildSvgString
// ---------------------------------------------------------------------------
describe('buildSvgString', () => {
  const palette = 'R#FF0000 G#00FF00'

  it('returns an object with svg string and numeric size', () => {
    const result = buildSvgString('R10 G10', palette)
    expect(typeof result.svg).toBe('string')
    expect(typeof result.size).toBe('number')
  })

  it('size equals the total pixel width of all thread entries', () => {
    // R10 G10: 2 entries, both end entries → total=(10+10), sizes=[40,40], cumulative=[40,80]
    const result = buildSvgString('R10 G10', palette)
    expect(result.size).toBe(80)
  })

  it('svg contains the correct viewBox matching the computed size', () => {
    const result = buildSvgString('R10 G10', palette)
    expect(result.svg).toContain(`viewBox="0 0 ${result.size} ${result.size}"`)
  })

  it('svg contains horizontal and vertical stripe groups', () => {
    const result = buildSvgString('R10 G10', palette)
    expect(result.svg).toContain('id="horizStripes"')
    expect(result.svg).toContain('id="vertStripes"')
  })

  it('svg contains a grating mask for the crosshatch effect', () => {
    const result = buildSvgString('R10 G10', palette)
    expect(result.svg).toContain('id="grating"')
    expect(result.svg).toContain('mask="url(#grating)"')
  })

  it('svg includes the palette colors as fill attributes', () => {
    const result = buildSvgString('R10 G10', palette)
    expect(result.svg).toContain('#FF0000')
    expect(result.svg).toContain('#00FF00')
  })

  it('handles a single-color pattern', () => {
    const result = buildSvgString('R10', 'R#FF0000')
    expect(result.size).toBe(40)
    expect(result.svg).toContain('viewBox="0 0 40 40"')
    expect(result.svg).toContain('#FF0000')
  })
})

// ---------------------------------------------------------------------------
// svgToDataUri
// ---------------------------------------------------------------------------
describe('svgToDataUri', () => {
  it('prepends the svg data URI scheme', () => {
    const uri = svgToDataUri('<svg></svg>')
    expect(uri.startsWith('data:image/svg+xml;utf8,')).toBe(true)
  })

  it('percent-encodes the SVG content', () => {
    const uri = svgToDataUri('<svg></svg>')
    expect(uri).toBe('data:image/svg+xml;utf8,%3Csvg%3E%3C%2Fsvg%3E')
  })

  it('round-trips through decodeURIComponent', () => {
    const original = '<svg viewBox="0 0 100 100"></svg>'
    const uri = svgToDataUri(original)
    const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''))
    expect(decoded).toBe(original)
  })
})
