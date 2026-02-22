import { useState, useRef, useEffect } from 'react';
import lunr from 'lunr';

interface SearchResult {
  slug: string;
  title: string;
}

function SearchResults({ results }: { results: SearchResult[] }) {
  return (
    <div className="search-results">
      {results.length ? (
        <>
          <h2>
            {results.length} tartan{results.length === 1 ? '' : 's'} matched your query
          </h2>
          <ul>
            {results.map((result) => (
              <li key={result.slug}>
                <a href={`/tartan/${result.slug}`}>{result.title}</a>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Sorry, no matches found.</p>
      )}
    </div>
  );
}

export default function SearchWidget() {
  const inputEl = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const indexRef = useRef<lunr.Index | null>(null);
  const storeRef = useRef<Record<string, { title: string }>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Lazy load the search index
    fetch('/search-index.json')
      .then((res) => res.json())
      .then((data) => {
        indexRef.current = lunr.Index.load(data.index);
        storeRef.current = data.store;
        setLoaded(true);
      })
      .catch(() => {
        // Search index not available yet
      });
  }, []);

  const handleSearch = (query: string) => {
    setValue(query);

    if (!query.length) {
      setResults([]);
      return;
    }

    if (!indexRef.current || !loaded) return;

    const keywords = query.trim().replace(/\*/g, '').toLowerCase().split(/\s+/);
    if (keywords[keywords.length - 1].length < 2) return;

    try {
      const index = indexRef.current;
      const store = storeRef.current;
      let andSearch: SearchResult[] = [];

      keywords
        .filter((el: string) => el.length > 1)
        .forEach((el: string, i: number) => {
          const keywordSearch = index
            .query(function (q: lunr.Query) {
              q.term(el, { editDistance: el.length > 5 ? 1 : 0 });
              q.term(el, { wildcard: 3 as lunr.Query.wildcard }); // LEADING | TRAILING
            })
            .map(({ ref }: { ref: string }) => ({
              slug: ref,
              title: store[ref]?.title || ref,
            }));

          andSearch =
            i > 0
              ? andSearch.filter((x: SearchResult) => keywordSearch.some((k: SearchResult) => k.slug === x.slug))
              : keywordSearch;
        });

      setResults(andSearch);
    } catch {
      // ignore search errors
    }
  };

  return (
    <div className="search-wrapper">
      <div role="search">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', top: '0.7rem', left: '0.25rem', pointerEvents: 'none' }}>
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 10l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <label htmlFor="search-input" className="visually-hidden">
          Search Tartans by Name
        </label>
        <input
          id="search-input"
          className={value.length ? 'search-input' : 'search-input mobile-minified'}
          ref={inputEl}
          type="search"
          value={value}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search Tartans by Name"
        />
        {value && (
          <button
            type="button"
            aria-label="Reset search"
            onClick={() => {
              setValue('');
              setResults([]);
              inputEl.current?.focus();
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      {value.trim().length > 1 && <SearchResults results={results} />}
    </div>
  );
}
