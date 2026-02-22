import { useState, useMemo, useCallback } from 'react';

interface Props {
  name: string;
  palette: string;
  threadcount: string;
  parentSlug: string;
}

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
        <pattern id="ed-pattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <polygon points="0,4 0,8 8,0 4,0" fill="#ffffff" />
          <polygon points="4,8 8,8 8,4" fill="#ffffff" />
        </pattern>
        <mask id="ed-grating" x="0" y="0" width="1" height="1">
          <rect x="0" y="0" width="100%" height="100%" fill="url(#ed-pattern)" />
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
      <g mask="url(#ed-grating)">
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

function PaletteSwatch({ palette }: { palette: string }) {
  const entries = useMemo(() => {
    try {
      return palette.trim().split(/\s+/).map((entry) => {
        const [code, hex] = entry.split('#');
        return { code: code.trim(), hex: `#${hex}` };
      });
    } catch {
      return [];
    }
  }, [palette]);

  if (entries.length === 0) return null;

  return (
    <div className="glossary-swatches">
      {entries.map(({ code, hex }) => (
        <div key={code} className="glossary-swatch">
          <span className="glossary-swatch-color" style={{ background: hex }} />
          <span className="glossary-swatch-code">{code}</span>
          <span className="glossary-swatch-hex">{hex}</span>
        </div>
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

export default function TartanEditor({ name: initialName, palette: initialPalette, threadcount: initialThreadcount, parentSlug }: Props) {
  const [newName, setNewName] = useState('');
  const [description, setDescription] = useState('');
  const [palette, setPalette] = useState(initialPalette);
  const [threadcount, setThreadcount] = useState(initialThreadcount);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = useCallback(async () => {
    if (!newName.trim()) {
      setError('Please enter a name for your tartan.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/tartans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description,
          palette,
          threadcount,
          parent_slug: parentSlug,
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
  }, [newName, description, palette, threadcount, parentSlug]);

  return (
    <div className="edit-container">
      <div className="edit-panel">
        <p className="parent-info">Editing based on: <strong>{initialName}</strong></p>

        <label htmlFor="ed-name">New Tartan Name</label>
        <input
          id="ed-name"
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Enter a name for your tartan"
        />

        <label htmlFor="ed-desc">Description</label>
        <textarea
          id="ed-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
        />

        <label htmlFor="ed-palette">Palette</label>
        <textarea
          id="ed-palette"
          value={palette}
          onChange={(e) => setPalette(e.target.value)}
          rows={3}
        />
        <PaletteSwatch palette={palette} />

        <label htmlFor="ed-threadcount">Threadcount</label>
        <textarea
          id="ed-threadcount"
          value={threadcount}
          onChange={(e) => setThreadcount(e.target.value)}
          rows={3}
        />

        <Glossary />

        {error && <p style={{ color: '#C80000', fontSize: '0.875rem' }}>{error}</p>}

        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save New Tartan'}
        </button>
      </div>
      <div className="edit-preview">
        <TartanSvgPreview threadcount={threadcount} palette={palette} />
      </div>
    </div>
  );
}
