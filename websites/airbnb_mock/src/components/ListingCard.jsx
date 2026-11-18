import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { useSave } from "./SaveWishlist";
import { SidLink } from "./navigation";
import { Icon, Modal } from "./ui";
import {
  computePrice,
  defaultWeekend,
  money,
  dateRange,
} from "../utils/pricing";
export function roomUrl(l, q = {}) {
  const p = new URLSearchParams();
  if (q.checkIn) p.set("checkin", q.checkIn);
  if (q.checkOut) p.set("checkout", q.checkOut);
  for (const [k, v] of Object.entries(q.guests || {})) if (v) p.set(k, v);
  return `/rooms/${l.id}${p.size ? "?" + p : ""}`;
}
export default function ListingCard({
  listing: l,
  home = false,
  query = {},
  onHover,
  unavailable = false,
}) {
  const { state, actions, listingRating, listingReviewCount, isSaved } =
      useApp(),
    { save } = useSave(),
    [index, setIndex] = useState(0),
    [priceOpen, setPriceOpen] = useState(false);
  const photos = l.photos || [],
    q = home ? { ...defaultWeekend(), guests: { adults: 2 } } : query,
    rate = listingRating(l.id),
    count = listingReviewCount(l.id),
    nights = q.flexible
      ? { weekend: 2, week: 7, month: 28 }[q.flexible.length] || 2
      : null;
  let dates = q;
  if (nights && !q.checkIn) {
    const weekend = defaultWeekend(),
      out = new Date(weekend.checkIn + "T12:00");
    out.setDate(out.getDate() + nights);
    dates = {
      ...q,
      checkIn: weekend.checkIn,
      checkOut: `${out.getFullYear()}-${String(out.getMonth() + 1).padStart(2, "0")}-${String(out.getDate()).padStart(2, "0")}`,
    };
  }
  const p =
      dates.checkIn && dates.checkOut
        ? computePrice(l, dates.checkIn, dates.checkOut, dates.guests)
        : null,
    price = p
      ? state.preferences?.displayTotalBeforeTaxes
        ? p.total - p.taxes
        : p.nightsSubtotal - p.discount
      : l.nightlyPrice;
  return (
    <article
      className={`listing-card ${home ? "home-card" : ""}`}
      onMouseEnter={() => onHover?.(l.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="card-photo">
        <SidLink
          to={roomUrl(l, home ? dates : q)}
          onClick={() => actions.viewed(l.id)}
          aria-label={l.title}
        >
          <img
            src={photos[index] || "/favicon.svg"}
            alt={l.title}
            loading="lazy"
          />
        </SidLink>
        {l.guestFavorite && <span className="badge">Guest favorite</span>}
        {l.luxe && !l.guestFavorite && <span className="badge luxe">Luxe</span>}
        <button
          className={`heart ${isSaved(l.id) ? "saved" : ""}`}
          aria-label={`${isSaved(l.id) ? "Remove" : "Save"} ${l.title}`}
          onClick={() => save(l.id)}
        >
          <Icon
            name="Heart"
            size={26}
            fill={isSaved(l.id) ? "#FF385C" : "rgba(0,0,0,.5)"}
          />
        </button>
        {photos.length > 1 && (
          <>
            <button
              className="photo-prev icon-btn"
              aria-label="Previous photo"
              onClick={() =>
                setIndex((i) => (i - 1 + photos.length) % photos.length)
              }
            >
              <Icon name="ChevronLeft" size={18} />
            </button>
            <button
              className="photo-next icon-btn"
              aria-label="Next photo"
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
            >
              <Icon name="ChevronRight" size={18} />
            </button>
            <div className="photo-dots">
              {photos.slice(0, 5).map((p, i) => (
                <i className={i === index % 5 ? "active" : ""} key={i} />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="card-info">
        <SidLink
          to={roomUrl(l, home ? dates : q)}
          onClick={() => actions.viewed(l.id)}
        >
          <div className="row between">
            <strong>
              {(l.propertyType || "Home")
                .replaceAll("_", " ")
                .replace(/^./, (x) => x.toUpperCase())}{" "}
              in {l.city || "a beautiful place"}
            </strong>
            {!home && (
              <span className="rating">
                ★ {count ? rate.toFixed(2) : "New"}
                {count ? ` (${count})` : ""}
              </span>
            )}
          </div>
          {!home && (
            <>
              <div className="muted ellipsis">{l.title}</div>
              <div className="muted">
                {q.checkIn
                  ? dateRange(q.checkIn, q.checkOut)
                  : `${l.roomType === "private_room" ? "Private room" : l.bedrooms ? l.bedrooms + " bedrooms" : "Studio"} · ${l.beds || 1} bed${l.beds > 1 ? "s" : ""}`}
              </div>
              {["flexible", "moderate"].includes(l.cancellationPolicy) && (
                <div className="muted">Free cancellation</div>
              )}
            </>
          )}
        </SidLink>
        <div className="card-price">
          <button onClick={() => setPriceOpen(true)}>
            <span>{money(price, false)}</span>{" "}
            {p
              ? state.preferences?.displayTotalBeforeTaxes
                ? "total before taxes"
                : `for ${p.nights} nights`
              : "night"}
          </button>
          {home && (
            <span className="muted">
              {" "}
              · ★ {count ? rate.toFixed(2) : "New"}
            </span>
          )}
        </div>
        {unavailable && <small>Unavailable for your dates</small>}
      </div>
      {priceOpen && (
        <Modal title="Price details" onClose={() => setPriceOpen(false)}>
          {p ? (
            <PriceBreakdown price={p} />
          ) : (
            <p>
              {money(l.nightlyPrice)} per night. Add dates to see the full
              price.
            </p>
          )}
        </Modal>
      )}
    </article>
  );
}
export function PriceBreakdown({ price: p }) {
  const { state } = useApp();
  const [explain, setExplain] = useState(null);
  if (!p) return null;
  return (
    <div className="breakdown">
      {[
        [
          "Nightly rate",
          `${money(p.nightlyRate)} × ${p.nights} nights`,
          p.nightsSubtotal,
        ],
        ["discount", "Discount", -p.discount],
        ["Cleaning fee", "Cleaning fee", p.cleaningFee],
        ["Pet fee", "Pet fee", p.petFee],
        ["Airbnb service fee", "Airbnb service fee", p.serviceFee],
        ["Taxes", "Taxes", p.taxes],
      ]
        .filter(([k, label, v]) => v || k === "Nightly rate")
        .map(([key, label, value]) => (
          <div className="row between" key={key}>
            <button className="text" onClick={() => setExplain(key)}>
              {label}
            </button>
            <span>{money(value)}</span>
          </div>
        ))}
      <div className="row between total">
        <strong>Total ({state.preferences?.currency || "USD"})</strong>
        <strong>{money(p.total)}</strong>
      </div>
      {explain && (
        <Modal title={explain} onClose={() => setExplain(null)}>
          <p>
            {{
              "Cleaning fee":
                "One-time fee charged by the host to cover the cost of cleaning their space.",
              "Airbnb service fee":
                "This helps us run our platform and offer services like 24/7 support.",
              Taxes: "Local occupancy taxes are included in your total.",
              "Pet fee": "A one-time fee for bringing your pets.",
            }[explain] ||
              "Calculated from your nightly rate, stay length and any weekly, monthly or non-refundable discount."}
          </p>
        </Modal>
      )}
    </div>
  );
}
