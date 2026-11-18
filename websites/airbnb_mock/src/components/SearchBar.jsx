import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { useSidNavigate } from "./navigation";
import { readSearch, searchUrl, emptyGuests } from "../utils/search";
import {
  dateRange,
  fmtDate,
  guestText,
  ymd,
  daysFromNow,
} from "../utils/pricing";
import { Icon, Calendar, Guests, Chip, Stepper } from "./ui";
export default function SearchBar({ variant = "expanded", onClose }) {
  const { state, actions } = useApp(),
    nav = useSidNavigate(),
    loc = useLocation(),
    params = useParams(),
    slug =
      params.slug ||
      decodeURIComponent(
        loc.pathname.match(/^\/s\/([^/]+)\/homes/)?.[1] || "Anywhere",
      ),
    ref = useRef();
  const [draft, setDraft] = useState(() =>
      readSearch(new URLSearchParams(loc.search), slug || "Anywhere", state),
    ),
    [panel, setPanel] = useState(null),
    [expanded, setExpanded] = useState(variant === "expanded"),
    [input, setInput] = useState(draft.query === "Anywhere" ? "" : draft.query),
    [dateTab, setDateTab] = useState("Dates"),
    [months, setMonths] = useState(1);
  useEffect(() => {
    const q = readSearch(
      new URLSearchParams(loc.search),
      slug || "Anywhere",
      state,
    );
    setDraft(q);
    setInput(q.query === "Anywhere" ? "" : q.query);
  }, [loc.search, slug]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") {
        setPanel(null);
        if (variant === "compact") setExpanded(false);
        onClose?.();
      }
    };
    const outside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setPanel(null);
        if (variant === "compact") setExpanded(false);
      }
    };
    document.addEventListener("keydown", key);
    document.addEventListener("mousedown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("mousedown", outside);
    };
  }, []);
  const patch = (p) => setDraft((d) => ({ ...d, ...p })),
    submit = (e) => {
      e?.preventDefault();
      const q = {
        ...draft,
        query: input.trim() || "Anywhere",
        destinationId:
          state.destinations.find(
            (d) => d.name.toLowerCase() === input.toLowerCase(),
          )?.id || null,
        page: 1,
      };
      actions.search(q);
      setPanel(null);
      if (variant === "compact") setExpanded(false);
      nav(searchUrl(q, state));
    };
  const pick = (d) => {
    setInput(d.name);
    patch({ query: d.name, destinationId: d.id });
    setPanel("dates");
  };
  const suggested = state.destinations
    .filter(
      (d) =>
        !input ||
        [d.name, d.region, d.country].some((x) =>
          x?.toLowerCase().includes(input.toLowerCase()),
        ),
    )
    .slice(0, 8);
  const cities = [
    ...new Set(
      state.listings
        .map((l) => l.city)
        .filter(
          (x) =>
            x &&
            input &&
            x.toLowerCase().includes(input.toLowerCase()) &&
            !suggested.some((d) => d.name === x),
        ),
    ),
  ].slice(0, 8 - suggested.length);
  const changeMonths = (n) => {
    setMonths(n);
    const a = new Date();
    a.setMonth(a.getMonth() + 1, 1);
    const b = new Date(a);
    b.setMonth(b.getMonth() + n);
    patch({ checkIn: ymd(a), checkOut: ymd(b), flexible: null });
  };
  if (!expanded)
    return (
      <button
        className="compact-search"
        onClick={() => {
          setExpanded(true);
          setPanel("where");
        }}
        aria-label="Edit search"
      >
        <strong>{draft.query || "Anywhere"}</strong>
        <span>{dateRange(draft.checkIn, draft.checkOut)}</span>
        <span className="muted">
          {draft.guests.adults ? guestText(draft.guests) : "Add guests"}
        </span>
        <i>
          <Icon name="Search" size={16} />
        </i>
      </button>
    );
  return (
    <>
      {variant === "compact" && <div className="search-backdrop" />}
      <div
        ref={ref}
        className={`search-wrap ${variant === "compact" ? "overlay-search" : ""}`}
      >
        <form
          className={`expanded-search ${panel ? "active" : ""}`}
          onSubmit={submit}
        >
          <div
            className={`search-segment where ${panel === "where" ? "active" : ""}`}
            onClick={() => setPanel("where")}
          >
            <label htmlFor="where-input">Where</label>
            <input
              id="where-input"
              aria-label="Search destinations"
              placeholder="Search destinations"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setPanel("where");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && panel === "where") {
                  e.preventDefault();
                  patch({ query: input, destinationId: null });
                  setPanel("dates");
                }
              }}
            />
            {input && (
              <button
                type="button"
                className="clear"
                aria-label="Clear destination"
                onClick={(e) => {
                  e.stopPropagation();
                  setInput("");
                  patch({ destinationId: null });
                }}
              >
                ×
              </button>
            )}
          </div>
          {[
            ["Check in", "checkIn"],
            ["Check out", "checkOut"],
          ].map(([label, key]) => (
            <button
              type="button"
              key={key}
              className={`search-segment ${panel === key ? "active" : ""}`}
              onClick={() => setPanel(key)}
            >
              <b>{label}</b>
              <span>{draft[key] ? fmtDate(draft[key]) : "Add dates"}</span>
            </button>
          ))}
          <button
            type="button"
            className={`search-segment who ${panel === "who" ? "active" : ""}`}
            onClick={() => setPanel("who")}
          >
            <b>Who</b>
            <span>
              {draft.guests.adults ? guestText(draft.guests) : "Add guests"}
            </span>
          </button>
          <button className="search-submit" aria-label="Search">
            <Icon name="Search" />
            {panel && <span>Search</span>}
          </button>
        </form>
        {panel === "where" && (
          <div className="search-panel where-panel">
            {!input && (
              <>
                <h4>Recent searches</h4>
                {state.searchHistory.slice(0, 3).map((h) => (
                  <button
                    className="suggestion"
                    key={h.id}
                    onClick={() => {
                      setInput(h.query);
                      setDraft({ ...draft, ...h });
                      setPanel("dates");
                    }}
                  >
                    <span className="suggest-icon">
                      <Icon name="Clock" />
                    </span>
                    <div>
                      <strong>{h.query}</strong>
                      <small>
                        {dateRange(h.checkIn, h.checkOut)} ·{" "}
                        {guestText(h.guests)}
                      </small>
                    </div>
                  </button>
                ))}
              </>
            )}
            <h4>{input ? "Search results" : "Suggested destinations"}</h4>
            {suggested.map((d) => (
              <button className="suggestion" key={d.id} onClick={() => pick(d)}>
                <span className="suggest-icon">
                  <Icon name="MapPin" />
                </span>
                <div>
                  <strong>{d.name}</strong>
                  <small>{d.blurb}</small>
                </div>
              </button>
            ))}
            {cities.map((city) => (
              <button
                className="suggestion"
                key={city}
                onClick={() => {
                  setInput(city);
                  patch({ query: city, destinationId: null });
                  setPanel("dates");
                }}
              >
                <Icon name="MapPin" />
                {city}
              </button>
            ))}
            {input && !suggested.length && !cities.length && (
              <button
                className="suggestion"
                onClick={() => {
                  patch({ query: input, destinationId: null });
                  setPanel("dates");
                }}
              >
                Search for “{input}”
              </button>
            )}
            <Chip
              onClick={() => {
                setInput("Anywhere");
                patch({ query: "Anywhere", destinationId: null });
                setPanel("dates");
              }}
            >
              I’m flexible
            </Chip>
          </div>
        )}
        {["dates", "checkIn", "checkOut"].includes(panel) && (
          <div className="search-panel dates-panel">
            <div className="segmented">
              {["Dates", "Months", "Flexible"].map((t) => (
                <button
                  key={t}
                  className={dateTab === t ? "selected" : ""}
                  onClick={() => setDateTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            {dateTab === "Dates" ? (
              <>
                <Calendar
                  checkIn={draft.checkIn}
                  checkOut={draft.checkOut}
                  onChange={(dates) => {
                    patch({ ...dates, flexible: null });
                    if (dates.checkOut) setPanel("who");
                  }}
                />
                <div className="chips">
                  {[0, 1, 2, 3, 7].map((n) => (
                    <Chip
                      key={n}
                      active={draft.dateFlex === n}
                      onClick={() => patch({ dateFlex: n })}
                    >
                      {n ? `± ${n} day${n > 1 ? "s" : ""}` : "Exact dates"}
                    </Chip>
                  ))}
                </div>
              </>
            ) : dateTab === "Months" ? (
              <div className="month-stay">
                <h2>
                  Stay for {months} month{months > 1 ? "s" : ""}
                </h2>
                <Stepper
                  value={months}
                  min={1}
                  max={12}
                  label="Months"
                  onChange={changeMonths}
                />
                <p>
                  Starting {fmtDate(draft.checkIn)}, Ending{" "}
                  {fmtDate(draft.checkOut)}
                </p>
                <button
                  className="btn dark"
                  onClick={() => {
                    changeMonths(months);
                    setPanel("who");
                  }}
                >
                  Next
                </button>
              </div>
            ) : (
              <div className="flexible">
                <h3>How long would you like to stay?</h3>
                <div className="chips">
                  {["weekend", "week", "month"].map((length) => (
                    <Chip
                      key={length}
                      active={draft.flexible?.length === length}
                      onClick={() =>
                        patch({
                          flexible: {
                            length,
                            months: draft.flexible?.months || [],
                          },
                          checkIn: null,
                          checkOut: null,
                        })
                      }
                    >
                      {length.replace(/^./, (x) => x.toUpperCase())}
                    </Chip>
                  ))}
                </div>
                <h3>When do you want to go?</h3>
                <div className="chips">
                  {Array.from({ length: 6 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() + i + 1, 1);
                    const key = ymd(date).slice(0, 7);
                    return (
                      <Chip
                        key={key}
                        active={draft.flexible?.months.includes(key)}
                        onClick={() => {
                          const f = draft.flexible || {
                            length: "weekend",
                            months: [],
                          };
                          patch({
                            flexible: {
                              ...f,
                              months: f.months.includes(key)
                                ? f.months.filter((x) => x !== key)
                                : [...f.months, key],
                            },
                            checkIn: null,
                            checkOut: null,
                          });
                        }}
                      >
                        <Icon name="Calendar" />
                        {date.toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </Chip>
                    );
                  })}
                </div>
                <button
                  className="btn dark"
                  onClick={() => {
                    if (!draft.flexible)
                      patch({ flexible: { length: "weekend", months: [] } });
                    setPanel("who");
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
        {panel === "who" && (
          <div className="search-panel who-panel">
            <Guests
              value={draft.guests}
              onChange={(guests) => patch({ guests })}
            />
          </div>
        )}
      </div>
    </>
  );
}
