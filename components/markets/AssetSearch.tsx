"use client";

export function AssetSearch({
  onQueryChange,
  query,
  resultCount,
  totalCount,
}: {
  onQueryChange: (query: string) => void;
  query: string;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="market-toolbar asset-search">
      <label className="asset-search-input">
        <span className="sr-only">Search assets</span>
        <input
          aria-label="Search assets"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search assets... (e.g. cAAPL, Bitcoin, Gold)"
          value={query}
        />
        {query ? (
          <button aria-label="Clear asset search" className="search-clear-button" onClick={() => onQueryChange("")} type="button">
            ×
          </button>
        ) : null}
      </label>
      <span className="market-result-count">
        Showing {resultCount} of {totalCount} assets
      </span>
    </div>
  );
}
