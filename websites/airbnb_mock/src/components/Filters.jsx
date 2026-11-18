import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { emptyFilters, matchListings } from "../utils/search";
import { Modal, Button, Chip, Icon, Stepper, Field } from "./ui";
export default function Filters({ query, onApply, onClose }) {
  const { state } = useApp(),
    [draft, setDraft] = useState({ ...emptyFilters, ...query.filters }),
    [more, setMore] = useState(false),
    patch = (p) => setDraft((d) => ({ ...d, ...p })),
    toggle = (key, v) =>
      patch({
        [key]: draft[key].includes(v)
          ? draft[key].filter((x) => x !== v)
          : [...draft[key], v],
      });
  const count = matchListings(state, { ...query, filters: draft }).length;
  const amenity = (a) => (
    <Chip
      key={a.id}
      active={draft.amenities.includes(a.id)}
      onClick={() => toggle("amenities", a.id)}
    >
      <Icon name={a.icon} />
      {a.label}
    </Chip>
  );
  const minimum = draft.priceMin ?? 10,
    maximum = draft.priceMax ?? 1500,
    narrowed = minimum > 10 || maximum < 1500,
    prices = matchListings(state, {
      query: query.query,
      destinationId: query.destinationId,
      filters: emptyFilters,
    }).map((l) => l.nightlyPrice || 0),
    bins = Array.from(
      { length: 40 },
      (_, i) =>
        prices.filter((p) => p >= 10 + i * 37.25 && (i === 39 || p < 10 + (i + 1) * 37.25)).length,
    );
  return (
    <Modal
      title="Filters"
      wide
      onClose={onClose}
      footer={
        <>
          <Button variant="text" onClick={() => setDraft({ ...emptyFilters })}>
            Clear all
          </Button>
          <Button variant="dark" onClick={() => onApply(draft)}>
            Show {count} {count === 1 ? "place" : "places"}
          </Button>
        </>
      }
    >
      <section>
        <h2>Recommended for you</h2>
        <div className="chips">
          {[
            ["Free cancellation", "freeCancellation"],
            ["Hot tub", "hot_tub"],
            ["Pool", "pool"],
            ["Self check-in", "selfCheckIn"],
          ].map(([label, key]) => (
            <Chip
              key={key}
              active={
                key.includes("_") ? draft.amenities.includes(key) : draft[key]
              }
              onClick={() =>
                key.includes("_")
                  ? toggle("amenities", key)
                  : patch({ [key]: !draft[key] })
              }
            >
              {label}
            </Chip>
          ))}
        </div>
      </section>
      <section>
        <h2>Type of place</h2>
        <div className="segmented">
          {[
            ["Any type", "any"],
            ["Room", "private_room"],
            ["Entire home", "entire_home"],
          ].map(([label, value]) => (
            <button
              key={value}
              className={draft.roomType === value ? "selected" : ""}
              onClick={() => patch({ roomType: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2>Price range</h2>
        <p className="muted">Nightly prices before fees and taxes</p>
        <div className="histogram">
          {bins.map((n, i) => (
            <i
              key={i}
              style={{
                height: Math.max(4, n * 9) + "px",
                background: !narrowed
                  ? "#B0B0B0"
                  : 10 + (i + 1) * 37.25 < minimum ||
                      10 + i * 37.25 > maximum
                    ? "#ddd"
                    : "#222",
              }}
            />
          ))}
        </div>
        <div className="price-range" style={{
          "--range-start": `${((minimum - 10) / 1490) * 100}%`,
          "--range-end": `${((maximum - 10) / 1490) * 100}%`,
        }}>
        <input
          aria-label="Minimum nightly price"
          type="range"
          min="10"
          max="1500"
          value={minimum}
          onChange={(e) =>
            patch({
              priceMin: Math.min(
                Number(e.target.value),
                draft.priceMax || 1500,
              ),
            })
          }
        />
        <input
          aria-label="Maximum nightly price"
          type="range"
          min="10"
          max="1500"
          value={maximum}
          onChange={(e) =>
            patch({
              priceMax: Math.max(Number(e.target.value), draft.priceMin || 10),
            })
          }
        />
        </div>
        <div className="two price-inputs">
          <Field
            label="Minimum"
            type="number"
            min="10"
            max={maximum}
            value={minimum}
            onChange={(e) =>
              patch({
                priceMin: e.target.value === "" ? null : Math.max(10, Math.min(maximum, Number(e.target.value))),
              })
            }
          />
          <Field
            label="Maximum ($1,500+)"
            type="number"
            min={minimum}
            max="1500"
            value={maximum}
            onChange={(e) =>
              patch({
                priceMax: e.target.value === "" ? null : Math.max(minimum, Math.min(1500, Number(e.target.value))),
              })
            }
          />
        </div>
      </section>
      <section>
        <h2>Rooms and beds</h2>
        {["bedrooms", "beds", "bathrooms"].map((k) => (
          <div className="row between" key={k}>
            <p>
              {k.replace(/^./, (x) => x.toUpperCase())}{" "}
              {draft[k] === 0 && <small>· Any</small>}
            </p>
            <Stepper
              value={draft[k]}
              onChange={(n) => patch({ [k]: n })}
              label={k}
              max={16}
            />
          </div>
        ))}
      </section>
      <section>
        <h2>Amenities</h2>
        <div className="chips">
          {state.amenities
            .filter((a) => more || a.group === "essentials")
            .map(amenity)}
        </div>
        <button className="text" onClick={() => setMore(!more)}>
          {more ? "Show less" : "Show more"}
        </button>
      </section>
      <section>
        <h2>Booking options</h2>
        <div className="chips">
          {[
            ["Instant Book", "instantBook"],
            ["Self check-in", "selfCheckIn"],
            ["Allows pets", "allowsPets"],
            ["Free cancellation", "freeCancellation"],
          ].map(([label, key]) => (
            <Chip
              key={key}
              active={draft[key]}
              onClick={() => patch({ [key]: !draft[key] })}
            >
              {label}
            </Chip>
          ))}
        </div>
      </section>
      <section>
        <h2>Standout stays</h2>
        <div className="two">
          {[
            [
              "Guest favorite",
              "guestFavorite",
              "The most loved homes on Airbnb",
            ],
            ["Luxe", "luxe", "Luxury homes with elevated design"],
            ["Superhost", "superhost", "Experienced, highly rated hosts"],
          ].map(([label, k, sub]) => (
            <Chip
              key={k}
              active={draft[k]}
              onClick={() => patch({ [k]: !draft[k] })}
            >
              <Icon name="Medal" />
              <span>
                <strong>{label}</strong>
                <small>{sub}</small>
              </span>
            </Chip>
          ))}
        </div>
      </section>
      <section>
        <h2>Property type</h2>
        <div className="chips">
          {["house", "apartment", "guesthouse", "hotel"].map((k) => (
            <Chip
              key={k}
              active={draft.propertyTypes.includes(k)}
              onClick={() => toggle("propertyTypes", k)}
            >
              <Icon name={k === "house" ? "House" : "Building2"} />
              {k.replace(/^./, (x) => x.toUpperCase())}
            </Chip>
          ))}
        </div>
      </section>
      <section>
        <details>
          <summary>Accessibility features</summary>
          {[
            "Step-free guest entrance",
            "Guest entrance wider than 32 inches",
          ].map((v) => (
            <label className="check-row" key={v}>
              <input
                type="checkbox"
                checked={draft.accessibility.includes(v)}
                onChange={() => toggle("accessibility", v)}
              />
              {v}
            </label>
          ))}
        </details>
      </section>
      <section>
        <details>
          <summary>Host language</summary>
          {[
            "English",
            "Spanish",
            "French",
            "Portuguese",
            "German",
            "Italian",
            "Japanese",
            "Mandarin",
          ].map((v) => (
            <label className="check-row" key={v}>
              <input
                type="checkbox"
                checked={draft.hostLanguages.includes(v)}
                onChange={() => toggle("hostLanguages", v)}
              />
              {v}
            </label>
          ))}
        </details>
      </section>
    </Modal>
  );
}
