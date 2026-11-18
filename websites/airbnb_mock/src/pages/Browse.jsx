import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { useSidNavigate, SidLink } from "../components/navigation";
import { Icon, Chip, Switch, Button, Empty } from "../components/ui";
import ListingCard from "../components/ListingCard";
import OfflineMap from "../components/OfflineMap";
import Filters from "../components/Filters";
import {
  readSearch,
  searchUrl,
  matchListings,
  emptyFilters,
  filterCount,
} from "../utils/search";
import { availability, ymd } from "../utils/pricing";
export function Carousel({ title, listings, query }) {
  const ref = useRef(),
    [edges, setEdges] = useState({ start: true, end: true });
  const measure = useCallback(() => {
    const row = ref.current;
    if (!row) return;
    const start = row.scrollLeft < 5,
      end = row.scrollLeft + row.clientWidth >= row.scrollWidth - 5;
    setEdges((old) =>
      old.start === start && old.end === end ? old : { start, end },
    );
  }, []);
  useEffect(() => {
    measure();
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(measure)
      : null;
    observer?.observe(ref.current);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [listings, measure]);
  return (
    <section className="carousel-section">
      <div className="row between">
        <h2>
          <SidLink to={searchUrl(query || { query: "Anywhere" })}>
            {title} <Icon name="ChevronRight" size={20} />
          </SidLink>
        </h2>
        <div className="row">
          <button
            className="circle"
            disabled={edges.start}
            aria-label={`Previous ${title}`}
            onClick={() =>
              ref.current.scrollBy({
                left: -ref.current.clientWidth,
                behavior: "smooth",
              })
            }
          >
            <Icon name="ChevronLeft" size={16} />
          </button>
          <button
            className="circle"
            aria-label={`Next ${title}`}
            disabled={edges.end}
            onClick={() =>
              ref.current.scrollBy({
                left: ref.current.clientWidth,
                behavior: "smooth",
              })
            }
          >
            <Icon name="ChevronRight" size={16} />
          </button>
        </div>
      </div>
      <div
        className="carousel"
        ref={ref}
        onScroll={measure}
      >
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} home />
        ))}
      </div>
      {!listings.length && (
        <p className="muted">
          There are no homes here right now. Explore another destination.
        </p>
      )}
    </section>
  );
}
export function Home() {
  const { state, actions } = useApp(),
    nav = useSidNavigate();
  const rows = [
    ["Popular homes in Asheville", "asheville"],
    ["Available next month in Paris", "paris"],
    ["Stay in Joshua Tree", "joshua"],
    ["Homes in Lisbon", "lisbon"],
    ["Guests also checked out Lake Tahoe", "tahoe"],
    ["Places to stay in Miami", "miami"],
  ];
  return (
    <main className="home-page">
      {rows.map(([title, id]) => {
        const d = state.destinations.find((d) => d.id === `dst_${id}`);
        let eligible = state.listings;
        if (id === "paris") {
          const a = new Date();
          a.setMonth(a.getMonth() + 1, 1);
          const b = new Date(a);
          b.setDate(3);
          eligible = eligible.filter(
            (l) => !availability(state, l, ymd(a), ymd(b)),
          );
        }
        const listings = eligible
          .filter((l) => l.destinationId === `dst_${id}`)
          .slice(0, 10);
        return (
          <Carousel
            key={id}
            title={title}
            query={{ query: d?.name || id, destinationId: d?.id }}
            listings={listings}
          />
        );
      })}
      <section>
        <h2>Explore more destinations</h2>
        <div className="chips">
          {state.destinations.map((d) => (
            <SidLink
              className="chip"
              key={d.id}
              to={searchUrl({ query: d.name, destinationId: d.id }, state)}
            >
              {d.name}
            </SidLink>
          ))}
        </div>
      </section>
      {state.searchHistory.length > 0 && (
        <section>
          <h2>Continue searching</h2>
          <div className="chips">
            {state.searchHistory.map((h) => (
              <button
                className="chip"
                key={h.id}
                onClick={() => {
                  actions.search(h);
                  nav(searchUrl(h, state));
                }}
              >
                <Icon name="Clock" size={18} />
                {h.query}
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
export function CategoryBar({ query, onChange, onFilters }) {
  const { state, actions } = useApp(),
    ref = useRef();
  return (
    <div className="category-bar">
      <button
        className="circle"
        aria-label="Previous categories"
        onClick={() => ref.current.scrollBy({ left: -350, behavior: "smooth" })}
      >
        <Icon name="ChevronLeft" size={14} />
      </button>
      <div className="categories" ref={ref}>
        {state.categories.map((c) => (
          <button
            key={c.id}
            className={query.filters.category === c.id ? "active" : ""}
            onClick={() =>
              onChange({
                ...query,
                filters: {
                  ...query.filters,
                  category: query.filters.category === c.id ? null : c.id,
                },
                page: 1,
              })
            }
          >
            <Icon name={c.icon} />
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      <button
        className="circle"
        aria-label="More categories"
        onClick={() => ref.current.scrollBy({ left: 350, behavior: "smooth" })}
      >
        <Icon name="ChevronRight" size={14} />
      </button>
      <button className="filter-button" onClick={onFilters}>
        <Icon name="SlidersHorizontal" size={18} />
        Filters
        {filterCount(query.filters) > 0 && <b>{filterCount(query.filters)}</b>}
      </button>
      <label className="total-toggle">
        Display total before taxes
        <Switch
          label="Display total before taxes"
          checked={state.preferences.displayTotalBeforeTaxes}
          onChange={(v) => actions.preference({ displayTotalBeforeTaxes: v })}
        />
      </label>
    </div>
  );
}
export function Search() {
  const { state, actions } = useApp(),
    { slug } = useParams(),
    loc = useLocation(),
    nav = useSidNavigate(),
    q = readSearch(new URLSearchParams(loc.search), slug, state),
    [filters, setFilters] = useState(false),
    [hover, setHover] = useState(null),
    [map, setMap] = useState(false),
    [bounds, setBounds] = useState(null),
    all = matchListings(state, q),
    results = bounds ? all.filter((l) => bounds.includes(l.id)) : all,
    pages = Math.max(1, Math.ceil(results.length / 18)),
    page = Math.min(q.page, pages),
    rows = results.slice((page - 1) * 18, page * 18),
    change = (next) => {
      setBounds(null);
      nav(searchUrl(next, state));
    };
  return (
    <>
      <CategoryBar
        query={q}
        onChange={change}
        onFilters={() => setFilters(true)}
      />
      <div className={`search-layout ${map ? "map-visible" : ""}`}>
        <main className="search-list">
          <div className="row between search-heading">
            <strong>
              {results.length} home{results.length === 1 ? "" : "s"}
              {q.query !== "Anywhere" ? ` in ${q.query}` : ""}
              {state.preferences.displayTotalBeforeTaxes && q.checkIn
                ? " · Prices include all fees"
                : ""}
            </strong>
            <select
              aria-label="Sort homes"
              value={q.sort}
              onChange={(e) => change({ ...q, sort: e.target.value, page: 1 })}
            >
              <option value="recommended">Recommended</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
          </div>
          {results.length ? (
            <>
              <div className="listing-grid">
                {rows.map((l) => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    query={q}
                    onHover={setHover}
                  />
                ))}
              </div>
              <div className="pagination">
                <button
                  className="circle"
                  aria-label="Previous page"
                  disabled={page === 1}
                  onClick={() => change({ ...q, page: page - 1 })}
                >
                  ‹
                </button>
                {Array.from({ length: pages }, (_, i) => (
                  <button
                    key={i}
                    className={`circle ${page === i + 1 ? "current" : ""}`}
                    onClick={() => change({ ...q, page: i + 1 })}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="circle"
                  aria-label="Next page"
                  disabled={page === pages}
                  onClick={() => change({ ...q, page: page + 1 })}
                >
                  ›
                </button>
                <p>
                  {(page - 1) * 18 + 1} – {Math.min(page * 18, results.length)}{" "}
                  of {results.length} homes
                </p>
              </div>
            </>
          ) : (
            <Empty title="No exact matches">
              <p>
                Try changing or removing some of your filters or adjusting your
                search area.
              </p>
              <Button
                onClick={() =>
                  change({ ...q, filters: { ...emptyFilters }, page: 1 })
                }
              >
                Remove all filters
              </Button>
            </Empty>
          )}
        </main>
        <aside className="search-map">
          <OfflineMap
            listings={all}
            visibleListings={rows}
            query={q}
            hovered={hover}
            onBoundsChange={setBounds}
          />
        </aside>
      </div>
      <Button
        className="map-toggle"
        variant="dark"
        onClick={() => setMap(!map)}
      >
        {map ? "Show list" : "Show map"}{" "}
        <Icon name={map ? "List" : "Map"} size={16} />
      </Button>
      {filters && (
        <Filters
          query={q}
          onClose={() => setFilters(false)}
          onApply={(draft) => {
            const next = { ...q, filters: draft, page: 1 };
            actions.search(next);
            change(next);
            setFilters(false);
          }}
        />
      )}
    </>
  );
}
