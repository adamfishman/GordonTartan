import { useState, useMemo, useCallback, useEffect, useRef, type ChangeEvent } from 'react';
import { officialColors } from '../data/official-colors';

interface ThreadEntry {
  fill: string;
  size: number;
}

function countPattern(threadcount: string, palette: string): ThreadEntry[] {
  const paletteColors: Record<string, string> = palette.split(' ').reduce((acc: Record<string, string>, curr) => {
    const el = curr.split('#');
    acc[el[0].trim()] = `#${el[1]}`;
    return acc;
  }, {});

  const array = threadcount.split(' ');
  let result: ThreadEntry[] = [];
  let total = 0;

  const colCountArray = array.map((el, index) => {
    const regex = /([a-zA-Z]+|\(.*?\))(\/?)(\d+)/gm;
    const m = regex.exec(el);
    if (m !== null) {
      total += index === 0 || index === array.length - 1 ? 1 * Number(m[3]) : 2 * Number(m[3]);
      return { fill: paletteColors[m[1]] || '#000000', size: 4 * Number(m[3]) };
    }
    return { fill: '#000000', size: 0 };
  });

  if (array[0].indexOf('/') > -1) {
    for (let i = 0; i < 2 * array.length - 2; i++) {
      const index = i < array.length - 1 ? i : 2 * array.length - 2 - i;
      result.push(colCountArray[index]);
    }
    if (total % 2) {
      const len = result.length;
      for (let i = 0; i < len; i++) {
        result.push(result[i]);
      }
    }
  } else {
    for (let i = 0; i < array.length; i++) {
      result.push(colCountArray[i]);
    }
    if (total % 2) {
      const len = array.length;
      for (let i = 0; i < len - 1; i++) {
        result.push(result[i]);
      }
    }
  }
  return result;
}

function TartanSvgPreview({ threadcount, palette }: { threadcount: string; palette: string }) {
  const tartanCount = useMemo(() => {
    try {
      return countPattern(threadcount, palette);
    } catch {
      return [];
    }
  }, [threadcount, palette]);

  if (tartanCount.length === 0) {
    return <div style={{ color: '#E8C000', textAlign: 'center' }}>Invalid pattern</div>;
  }

  const cumulativeSizes: number[] = [];
  let sum = 0;
  for (const entry of tartanCount) {
    sum += entry.size;
    cumulativeSizes.push(sum);
  }

  const size = cumulativeSizes[cumulativeSizes.length - 1];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={Math.min(size, 400)}
      height={Math.min(size, 400)}
      xmlns="http://www.w3.org/2000/svg"
      style={{ maxWidth: '100%' }}
    >
      <defs>
        <pattern id="cr-pattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <polygon points="0,4 0,8 8,0 4,0" fill="#ffffff" />
          <polygon points="4,8 8,8 8,4" fill="#ffffff" />
        </pattern>
        <mask id="cr-grating" x="0" y="0" width="1" height="1">
          <rect x="0" y="0" width="100%" height="100%" fill="url(#cr-pattern)" />
        </mask>
      </defs>
      <g>
        {tartanCount.map((el, index) => (
          <rect
            key={`h-${index}`}
            fill={el.fill}
            height={el.size}
            width="100%"
            x="0"
            y={cumulativeSizes[index - 1] || 0}
          />
        ))}
      </g>
      <g mask="url(#cr-grating)">
        {tartanCount.map((el, index) => (
          <rect
            key={`v-${index}`}
            fill={el.fill}
            height="100%"
            width={el.size}
            x={cumulativeSizes[index - 1] || 0}
            y="0"
          />
        ))}
      </g>
    </svg>
  );
}

interface PaletteEntry {
  code: string;
  hex: string;
}

function parsePalette(palette: string): PaletteEntry[] {
  try {
    return palette.trim().split(/\s+/).filter(Boolean).map((entry) => {
      const [code, hex] = entry.split('#');
      return { code: code.trim(), hex: `#${hex}` };
    });
  } catch {
    return [];
  }
}

function serializePalette(entries: PaletteEntry[]): string {
  return entries.map((e) => `${e.code}${e.hex.toUpperCase()}`).join(' ');
}

function PaletteEditor({ palette, setPalette }: { palette: string; setPalette: (v: string) => void }) {
  const [entries, setEntries] = useState<PaletteEntry[]>(() => parsePalette(palette));
  const [showRaw, setShowRaw] = useState(false);
  const colorInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lastSerializedRef = useRef(palette);

  useEffect(() => {
    if (palette !== lastSerializedRef.current) {
      setEntries(parsePalette(palette));
      lastSerializedRef.current = palette;
    }
  }, [palette]);

  const updateEntries = useCallback((next: PaletteEntry[]) => {
    setEntries(next);
    const serialized = serializePalette(next);
    lastSerializedRef.current = serialized;
    setPalette(serialized);
  }, [setPalette]);

  const handleCodeChange = useCallback((index: number, code: string) => {
    const next = [...entries];
    next[index] = { ...next[index], code };
    updateEntries(next);
  }, [entries, updateEntries]);

  const handleColorChange = useCallback((index: number, hex: string) => {
    const next = [...entries];
    next[index] = { ...next[index], hex };
    updateEntries(next);
  }, [entries, updateEntries]);

  const handleRemove = useCallback((index: number) => {
    const next = entries.filter((_, i) => i !== index);
    updateEntries(next);
  }, [entries, updateEntries]);

  const handleAdd = useCallback(() => {
    const next = [...entries, { code: 'N', hex: '#808080' }];
    updateEntries(next);
  }, [entries, updateEntries]);

  return (
    <div>
      <div className="palette-editor">
        {entries.map((entry, i) => (
          <div key={i} className="palette-entry">
            <div
              className="palette-entry-swatch"
              style={{ backgroundColor: entry.hex }}
              onClick={() => colorInputRefs.current[i]?.click()}
            >
              <input
                ref={(el) => { colorInputRefs.current[i] = el; }}
                type="color"
                value={entry.hex}
                onChange={(e) => handleColorChange(i, e.target.value)}
                tabIndex={-1}
              />
            </div>
            <input
              className="palette-entry-code"
              type="text"
              value={entry.code}
              onChange={(e) => handleCodeChange(i, e.target.value)}
              maxLength={4}
            />
            <span className="palette-entry-hex">{entry.hex}</span>
            <button
              type="button"
              className="palette-entry-remove"
              onClick={() => handleRemove(i)}
              title="Remove color"
            >&times;</button>
          </div>
        ))}
        <button type="button" className="palette-add-btn" onClick={handleAdd}>+ Add Color</button>
      </div>
      <button
        type="button"
        className="palette-raw-toggle"
        onClick={() => setShowRaw(!showRaw)}
      >{showRaw ? 'Hide raw' : 'Edit raw'}</button>
      {showRaw && (
        <textarea
          className="palette-raw-textarea"
          value={palette}
          onChange={(e) => setPalette(e.target.value)}
          rows={2}
        />
      )}
    </div>
  );
}

interface ThreadcountSegment {
  code: string;
  pivot: boolean;
  size: number;
}

const THREADCOUNT_TOKEN = /([a-zA-Z]+|\([^)]*\))(\/?)(\d+)/g;

function parseThreadcount(threadcount: string): ThreadcountSegment[] {
  const tokens = threadcount.trim().split(/\s+/).filter(Boolean);
  const result: ThreadcountSegment[] = [];
  for (const token of tokens) {
    THREADCOUNT_TOKEN.lastIndex = 0;
    const m = THREADCOUNT_TOKEN.exec(token);
    if (m) {
      result.push({
        code: m[1],
        pivot: m[2] === '/',
        size: Math.max(1, Math.floor(Number(m[3]) || 1)),
      });
    }
  }
  if (result.length === 0) return result;
  const hasPivot = result.some((entry) => entry.pivot);
  if (hasPivot) {
    return result.map((entry, index) => ({ ...entry, pivot: index === 0 }));
  }
  return result;
}

function serializeThreadcount(segments: ThreadcountSegment[]): string {
  return segments
    .map((s) => {
      const code = s.code.trim();
      const pivot = s.pivot ? '/' : '';
      const size = Math.max(1, Math.floor(s.size));
      return `${code}${pivot}${size}`;
    })
    .join(' ');
}

function charToThreadCount(charCode: number): number {
  const raw = ((charCode * 17) % 59) + 2;
  return raw - (raw % 2);
}

function generateTextThreadcount(
  text: string,
  palette: PaletteEntry[],
  colorMode: 'cycle' | 'derived',
  symmetric: boolean,
  separators: boolean,
): string {
  if (!text || palette.length === 0) return '';

  const entries: string[] = [];

  for (let i = 0; i < text.length; i++) {
    if (separators && i > 0) {
      entries.push(`${palette[0].code}2`);
    }
    const charCode = text.charCodeAt(i);
    const threadCount = charToThreadCount(charCode);
    const colorIndex =
      colorMode === 'cycle'
        ? i % palette.length
        : charCode % palette.length;
    const color = palette[colorIndex].code;
    entries.push(`${color}${threadCount}`);
  }

  if (symmetric && entries.length > 0) {
    entries[0] = entries[0].replace(/^([a-zA-Z]+)/, '$1/');
    if (entries.length > 1) {
      const last = entries[entries.length - 1];
      entries[entries.length - 1] = last.replace(/^([a-zA-Z]+)/, '$1/');
    }
  }

  return entries.join(' ');
}

function TextToThreadcount({ palette, setThreadcount }: { palette: string; setThreadcount: (v: string) => void }) {
  const [text, setText] = useState('');
  const [colorMode, setColorMode] = useState<'cycle' | 'derived'>('cycle');
  const [symmetric, setSymmetric] = useState(true);
  const [separators, setSeparators] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const paletteEntries = useMemo(() => parsePalette(palette), [palette]);

  const handleTextChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { selectionStart, selectionEnd, value } = e.target;
    setText(value.toUpperCase());
    if (selectionStart === null || selectionEnd === null) return;
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(selectionStart, selectionEnd);
    });
  }, []);

  const handleGenerate = useCallback(() => {
    const tc = generateTextThreadcount(text, paletteEntries, colorMode, symmetric, separators);
    if (tc) setThreadcount(tc);
  }, [text, paletteEntries, colorMode, symmetric, separators, setThreadcount]);

  const canGenerate = text.trim().length > 2 && paletteEntries.length > 0;

  return (
    <details className="generate-section">
      <summary className="generate-title">Text-to-Threadcount Generator</summary>
      <div className="generate-body">
        <input
          className="generate-input"
          type="text"
          value={text}
          onChange={handleTextChange}
          placeholder="Enter secret message"
          ref={inputRef}
        />
        <div className="generate-controls">
          <label className="generate-option">
            <span>Colors:</span>
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as 'cycle' | 'derived')}
            >
              <option value="cycle">Cycle</option>
              <option value="derived">Derived</option>
            </select>
          </label>
          <label className="generate-option">
            <input
              type="checkbox"
              checked={symmetric}
              onChange={(e) => setSymmetric(e.target.checked)}
            />
            Symmetric
          </label>
          <label className="generate-option">
            <input
              type="checkbox"
              checked={separators}
              onChange={(e) => setSeparators(e.target.checked)}
            />
            Separators
          </label>
        </div>
        <button
          type="button"
          className="generate-btn"
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          Generate from Text
        </button>
      </div>
    </details>
  );
}

function ThreadcountEditor({ threadcount, setThreadcount, paletteCodes }: { threadcount: string; setThreadcount: (v: string) => void; paletteCodes: string[] }) {
  const [entries, setEntries] = useState<ThreadcountSegment[]>(() => parseThreadcount(threadcount));
  const [showRaw, setShowRaw] = useState(false);
  const lastSerializedRef = useRef(threadcount);

  useEffect(() => {
    const normalized = threadcount.trim();
    if (normalized !== lastSerializedRef.current) {
      setEntries(parseThreadcount(threadcount));
      lastSerializedRef.current = normalized;
    }
  }, [threadcount]);

  const isSymmetric = entries.length > 0 && entries[0].pivot;

  const updateEntries = useCallback((next: ThreadcountSegment[]) => {
    if (next.length > 0) {
      const symmetric = next[0].pivot;
      next = next.map((entry, index) => ({ ...entry, pivot: symmetric && index === 0 }));
    }
    setEntries(next);
    const serialized = serializeThreadcount(next);
    lastSerializedRef.current = serialized;
    setThreadcount(serialized);
  }, [setThreadcount]);

  const handleCodeChange = useCallback((index: number, code: string) => {
    const next = [...entries];
    next[index] = { ...next[index], code };
    updateEntries(next);
  }, [entries, updateEntries]);

  const handleSizeChange = useCallback((index: number, size: number) => {
    const next = [...entries];
    next[index] = { ...next[index], size: Math.max(1, Math.floor(size)) };
    updateEntries(next);
  }, [entries, updateEntries]);

  const handleRemove = useCallback((index: number) => {
    const next = entries.filter((_, i) => i !== index);
    updateEntries(next);
  }, [entries, updateEntries]);

  const handleAdd = useCallback(() => {
    const firstCode = paletteCodes[0] || 'K';
    const next = [...entries, { code: firstCode, pivot: false, size: 4 }];
    updateEntries(next);
  }, [entries, paletteCodes, updateEntries]);

  const handleSymmetricChange = useCallback((symmetric: boolean) => {
    if (entries.length === 0) return;
    const next = entries.map((entry, index) => ({ ...entry, pivot: symmetric && index === 0 }));
    updateEntries(next);
  }, [entries, updateEntries]);

  return (
    <div>
      <label className="threadcount-symmetric-toggle">
        Symmetric pattern
        <input
          type="checkbox"
          checked={isSymmetric}
          onChange={(e) => handleSymmetricChange(e.target.checked)}
        />
      </label>
      <div className="threadcount-editor">
        {entries.map((entry, i) => (
          <div key={i} className="threadcount-entry">
            <input
              className="threadcount-entry-code"
              type="text"
              value={entry.code}
              onChange={(e) => handleCodeChange(i, e.target.value)}
              placeholder="Code"
              list="threadcount-codes"
            />
            <input
              className="threadcount-entry-size"
              type="number"
              min={1}
              value={entry.size}
              onChange={(e) => handleSizeChange(i, e.target.valueAsNumber || 1)}
            />
            <button
              type="button"
              className="threadcount-entry-remove"
              onClick={() => handleRemove(i)}
              title="Remove segment"
            >&times;</button>
          </div>
        ))}
        <datalist id="threadcount-codes">
          {paletteCodes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <button type="button" className="threadcount-add-btn" onClick={handleAdd}>+ Add segment</button>
      </div>
      <button
        type="button"
        className="threadcount-raw-toggle"
        onClick={() => setShowRaw(!showRaw)}
      >{showRaw ? 'Hide raw' : 'Edit raw'}</button>
      {showRaw && (
        <textarea
          className="threadcount-raw-textarea"
          value={threadcount}
          onChange={(e) => setThreadcount(e.target.value)}
          rows={3}
        />
      )}
    </div>
  );
}

function ThreadcountBar({ threadcount, palette }: { threadcount: string; palette: string }) {
  const segments = useMemo(() => {
    try {
      const paletteColors: Record<string, string> = palette.split(' ').reduce((acc: Record<string, string>, curr) => {
        const el = curr.split('#');
        acc[el[0].trim()] = `#${el[1]}`;
        return acc;
      }, {});
      return threadcount.trim().split(/\s+/).map((el) => {
        const regex = /([a-zA-Z]+|\(.*?\))(\/?)(\d+)/gm;
        const m = regex.exec(el);
        if (m) {
          return { code: m[1], fill: paletteColors[m[1]] || '#000000', size: Number(m[3]) };
        }
        return null;
      }).filter(Boolean) as { code: string; fill: string; size: number }[];
    } catch {
      return [];
    }
  }, [threadcount, palette]);

  if (segments.length === 0) return null;

  return (
    <div className="threadcount-bar">
      {segments.map((seg, i) => (
        <div
          key={i}
          className="threadcount-segment"
          style={{ flexGrow: seg.size, backgroundColor: seg.fill }}
          title={`${seg.code}: ${seg.size} threads`}
        />
      ))}
    </div>
  );
}

function Glossary() {
  return (
    <details className="glossary">
      <summary className="glossary-title">How palette & threadcount work</summary>

      <div className="glossary-section">
        <h4>Palette</h4>
        <p>
          Defines the colors available in your tartan. Each entry is a <strong>short code</strong> followed by a <strong>hex color</strong>, separated by spaces.
        </p>
        <div className="glossary-example">
          <code>R#C80000 G#005020 K#101010 W#E0E0E0</code>
        </div>
        <table className="glossary-table">
          <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>R</code></td><td>A short name you pick (e.g. R for Red)</td></tr>
            <tr><td><code>#C80000</code></td><td>The hex color value</td></tr>
          </tbody>
        </table>
        <p className="glossary-hint">
          Codes can be any letters (R, DR, LB, etc.) &mdash; they just need to match what you use in the threadcount.
        </p>
      </div>

      <div className="glossary-section">
        <h4>Threadcount</h4>
        <p>
          Describes the sequence of colored stripes and how wide each one is. Each entry is a <strong>color code</strong> followed by a <strong>thread count</strong> (width).
        </p>
        <div className="glossary-example">
          <code>G/36 K2 W4 K2 R20 K2 W4 K2 G/36</code>
        </div>
        <table className="glossary-table">
          <thead><tr><th>Notation</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>G36</code></td><td>36 threads of color G</td></tr>
            <tr><td><code>K2</code></td><td>2 threads of color K</td></tr>
            <tr><td><code>/</code> after code</td><td>Pivot point &mdash; pattern mirrors here</td></tr>
          </tbody>
        </table>
      </div>

      <div className="glossary-section">
        <h4>Symmetric vs. Repeating</h4>
        <p>
          If the <strong>first entry has a <code>/</code></strong> (e.g. <code>G/36</code>), the pattern is <strong>symmetric</strong>: it plays forward then mirrors back. Without a <code>/</code>, the pattern simply repeats as written.
        </p>
        <div className="glossary-example">
          <div><strong>Symmetric:</strong> <code>R/10 K4 W2 K4 R/10</code></div>
          <div style={{ opacity: 0.6, fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            Renders as: R K W K R R K W K R ...
          </div>
          <div style={{ marginTop: '0.5rem' }}><strong>Repeating:</strong> <code>R10 K4 W2</code></div>
          <div style={{ opacity: 0.6, fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            Renders as: R K W R K W R K W ...
          </div>
        </div>
      </div>
    </details>
  );
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomHexColor(): string {
  const r = randomInt(0, 255);
  const g = randomInt(0, 255);
  const b = randomInt(0, 255);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function generateRandomTartan(colorPool?: string[]): { palette: string; threadcount: string } {
  const numColors = randomInt(3, 7);
  const availableLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Pick unique single-letter codes
  const codes: string[] = [];
  const usedIndices = new Set<number>();
  while (codes.length < numColors) {
    const idx = randomInt(0, availableLetters.length - 1);
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      codes.push(availableLetters[idx]);
    }
  }

  // Generate palette entries
  const paletteEntries = codes.map((code) => {
    const hex = colorPool ? colorPool[randomInt(0, colorPool.length - 1)] : randomHexColor();
    return `${code}${hex}`;
  });
  const paletteStr = paletteEntries.join(' ');

  // Generate threadcount entries
  const numEntries = randomInt(5, 15);
  const tcEntries: string[] = [];
  for (let i = 0; i < numEntries; i++) {
    const code = codes[randomInt(0, codes.length - 1)];
    const size = randomInt(2, 40);
    tcEntries.push(`${code}${size}`);
  }

  // Make symmetric: add / pivot to first entry, ensure last uses same code as first
  const firstCode = tcEntries[0].match(/^([A-Z]+)/)?.[1] || codes[0];
  tcEntries[0] = tcEntries[0].replace(firstCode, firstCode + '/');

  const lastSize = tcEntries[tcEntries.length - 1].match(/(\d+)$/)?.[1] || '10';
  tcEntries[tcEntries.length - 1] = `${firstCode}/${lastSize}`;

  const threadcountStr = tcEntries.join(' ');

  return { palette: paletteStr, threadcount: threadcountStr };
}

export default function TartanCreator() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [palette, setPalette] = useState('');
  const [threadcount, setThreadcount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [useOfficialColors, setUseOfficialColors] = useState(false);
  const [colorPoolSize, setColorPoolSize] = useState(100);

  const handleGenerate = useCallback(() => {
    const pool = useOfficialColors ? officialColors.slice(0, colorPoolSize) : undefined;
    const { palette: p, threadcount: tc } = generateRandomTartan(pool);
    setPalette(p);
    setThreadcount(tc);
  }, [useOfficialColors, colorPoolSize]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('Please enter a name for your tartan.');
      return;
    }
    if (!palette.trim() || !threadcount.trim()) {
      setError('Please add a palette and threadcount, or generate a random tartan.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/tartans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description,
          palette,
          threadcount,
          parent_slug: null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save');
        setSaving(false);
        return;
      }

      const tartan = await res.json();
      window.location.href = `/tartan/${tartan.slug}`;
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  }, [name, description, palette, threadcount]);

  const hasPattern = palette.trim() !== '' && threadcount.trim() !== '';

  return (
    <div className="edit-container">
      <div className="edit-panel-frame">
        <div className="edit-panel">
          <button
            type="button"
            className="generate-btn"
            onClick={handleGenerate}
          >
            Generate Random Tartan
          </button>
          <label className="generate-option">
            <input
              type="checkbox"
              checked={useOfficialColors}
              onChange={(e) => setUseOfficialColors(e.target.checked)}
            />
            Use official tartan colors
          </label>
          {useOfficialColors && (
            <label className="generate-option">
              <span>Pool:</span>
              <select
                value={colorPoolSize}
                onChange={(e) => setColorPoolSize(Number(e.target.value))}
              >
                <option value={10}>Top 10</option>
                <option value={25}>Top 25</option>
                <option value={100}>Top 100</option>
                <option value={500}>Top 500</option>
                <option value={1000}>Top 1000</option>
                <option value={officialColors.length}>All ({officialColors.length})</option>
              </select>
            </label>
          )}
          <TextToThreadcount palette={palette} setThreadcount={setThreadcount} />

          <label>Palette</label>
          <PaletteEditor palette={palette} setPalette={setPalette} />

          <label>Threadcount</label>
          <ThreadcountEditor
            threadcount={threadcount}
            setThreadcount={setThreadcount}
            paletteCodes={parsePalette(palette).map((e) => e.code)}
          />

          <Glossary />
        </div>
      </div>
      <div className="edit-preview">
        <div>
          {hasPattern ? (
            <>
              <TartanSvgPreview threadcount={threadcount} palette={palette} />
              <ThreadcountBar threadcount={threadcount} palette={palette} />
            </>
          ) : (
            <div className="preview-placeholder" aria-hidden="true" />
          )}
        </div>
      </div>
      <div className="edit-panel-frame">
        <div className="edit-panel">
          <label htmlFor="cr-name">Tartan Name</label>
          <input
            id="cr-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a name for your tartan"
          />

          <label htmlFor="cr-desc">Description</label>
          <textarea
            id="cr-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />

          {error && <p style={{ color: '#C80000', fontSize: '0.875rem' }}>{error}</p>}

          <button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save New Tartan'}
          </button>
        </div>
      </div>
    </div>
  );
}
