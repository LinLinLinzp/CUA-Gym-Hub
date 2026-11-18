import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import ListingCard from "./ListingCard";
import { Icon } from "./ui";
import { computePrice, money } from "../utils/pricing";
export default function OfflineMap({
  listings = [],
  visibleListings = listings,
  query = {},
  hovered,
  onBoundsChange,
}) {
  const { state, isSaved } = useApp(),
    [selected, setSelected] = useState(null),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [moving, setMoving] = useState(false),
    [drag, setDrag] = useState(null);
  const hasCoordinates = (l) => Number.isFinite(l.lat) && Number.isFinite(l.lng);
  const coords = visibleListings.filter(hasCoordinates),
    mapCoords = listings.filter(hasCoordinates),
    latitudes = mapCoords.map((l) => l.lat),
    longitudes = mapCoords.map((l) => l.lng),
    minLat = Math.min(...latitudes),
    maxLat = Math.max(...latitudes),
    minLng = Math.min(...longitudes),
    maxLng = Math.max(...longitudes),
    centerLat = (minLat + maxLat) / 2 || 0,
    centerLng = (minLng + maxLng) / 2 || 0,
    spanLat = Math.max(maxLat - minLat, 0.07),
    spanLng = Math.max(maxLng - minLng, 0.07);
  const mapSeed =
    [
      ...(query.destinationId ||
        query.query ||
        listings[0]?.destinationId ||
        "Airbnb"),
    ].reduce((n, c) => n + c.charCodeAt(0), 0) % 55;
  const position = (l) => ({
    x: 50 + ((l.lng - centerLng) / spanLng) * 72 * zoom + pan.x,
    y: 50 - ((l.lat - centerLat) / spanLat) * 72 * zoom + pan.y,
  });
  const finish = () => {
    setDrag(null);
    if (moving && onBoundsChange)
      onBoundsChange(
        listings
          .filter((l) => {
            const p = position(l);
            return p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100;
          })
          .map((l) => l.id),
      );
  };
  return (
    <div
      className="offline-map"
      onPointerDown={(e) => {
        if (e.target.tagName === "svg" || e.target.tagName === "rect")
          setDrag({ x: e.clientX, y: e.clientY, pan });
      }}
      onPointerMove={(e) => {
        if (drag) {
          const r = e.currentTarget.getBoundingClientRect();
          setPan({
            x: drag.pan.x + ((e.clientX - drag.x) / r.width) * 100,
            y: drag.pan.y + ((e.clientY - drag.y) / r.height) * 100,
          });
        }
      }}
      onPointerUp={finish}
      onPointerLeave={finish}
    >
      <svg
        viewBox="0 0 600 700"
        preserveAspectRatio="xMidYMid slice"
        aria-label="Map of homes"
      >
        <rect width="600" height="700" fill="#F3F1EC" />
        <g transform={`translate(${pan.x * 6} ${pan.y * 7}) scale(${zoom})`}>
          <path d="M390-50 Q180 140 350 320T280 750H650V-50Z" fill="#AADAFF" />
          <path
            d="M35 80l130-45 60 85-45 95-140-20zM120 425l110-30 55 100-50 90-140-10z"
            fill="#D8EBC9"
          />
          {Array.from({ length: 18 }, (_, i) => (
            <path
              key={i}
              d={`M${i * 55 - 200 + mapSeed} 0L${i * 55 + 180 + mapSeed} 700 M0 ${i * 55 - 100}L600 ${i * 55 + 120}`}
              stroke={i % 4 === 0 ? "#E3E0DA" : "#FBFAF8"}
              strokeWidth={i % 4 === 0 ? 12 : 7}
            />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M${i * 160 - 100} 0Q${i * 160 + 100} 350 ${i * 160 + 220} 700`}
              stroke="white"
              strokeWidth="8"
              fill="none"
            />
          ))}
        </g>
        <text x="180" y="230" fill="#6A6A6A" fontSize="17">
          {query.query === "Anywhere"
            ? "Explore homes"
            : query.query || listings[0]?.city || "Discover your next stay"}
        </text>
        <text x="80" y="410" fill="#8F9B85" fontSize="12">
          Nature reserve
        </text>
      </svg>
      {coords.map((l) => {
        const p = position(l),
          price =
            query.checkIn &&
            query.checkOut &&
            state.preferences?.displayTotalBeforeTaxes
              ? computePrice(l, query.checkIn, query.checkOut, query.guests)
              : null;
        return (
          <button
            key={l.id}
            className={`map-pin ${selected === l.id || hovered === l.id ? "active" : ""} ${state.recentlyViewed.some((v) => v.listingId === l.id) ? "visited" : ""}`}
            style={{ left: p.x + "%", top: p.y + "%" }}
            onClick={() => setSelected(l.id)}
          >
            {isSaved(l.id) && <span>♥ </span>}
            {money(price ? price.total - price.taxes : l.nightlyPrice, false)}
          </button>
        );
      })}
      {selected && coords.some((l) => l.id === selected) && (
        <div className="map-mini">
          <button
            className="icon-btn close-mini"
            aria-label="Close listing preview"
            onClick={() => setSelected(null)}
          >
            <Icon name="X" />
          </button>
          <ListingCard
            listing={coords.find((l) => l.id === selected)}
            query={query}
          />
        </div>
      )}
      {onBoundsChange && <label className="map-moving">
        <input
          type="checkbox"
          checked={moving}
          onChange={(e) => {
            setMoving(e.target.checked);
            if (!e.target.checked) onBoundsChange?.(null);
          }}
        />{" "}
        Search as I move the map
      </label>}
      <div className="map-zoom">
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((v) => Math.min(4, v + 0.25))}
        >
          <Icon name="Plus" />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((v) => Math.max(0.5, v - 0.25))}
        >
          <Icon name="Minus" />
        </button>
      </div>
      <small className="map-attribution">© Airbnb · Map data</small>
    </div>
  );
}
