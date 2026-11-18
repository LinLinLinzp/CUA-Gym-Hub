import {
  availability,
  computePrice,
  computeRefund,
  daysFromNow,
  nightsBetween,
} from "./pricing.js";
export const emptyGuests = { adults: 0, children: 0, infants: 0, pets: 0 };
export const emptyFilters = {
  category: null,
  roomType: "any",
  priceMin: null,
  priceMax: null,
  bedrooms: 0,
  beds: 0,
  bathrooms: 0,
  amenities: [],
  instantBook: false,
  selfCheckIn: false,
  freeCancellation: false,
  allowsPets: false,
  guestFavorite: false,
  luxe: false,
  superhost: false,
  propertyTypes: [],
  hostLanguages: [],
  accessibility: [],
};
const filterMap = {
  category: "category",
  roomType: "room_type",
  priceMin: "price_min",
  priceMax: "price_max",
  bedrooms: "min_bedrooms",
  beds: "min_beds",
  bathrooms: "min_bathrooms",
  amenities: "amenities",
  instantBook: "ib",
  selfCheckIn: "sci",
  freeCancellation: "fc",
  allowsPets: "pets_ok",
  guestFavorite: "gf",
  luxe: "luxe",
  superhost: "superhost",
  propertyTypes: "ptypes",
  hostLanguages: "host_languages",
  accessibility: "accessibility",
};
export function readSearch(params, slug = "Anywhere", s = {}) {
  const p = typeof params === "string" ? new URLSearchParams(params) : params,
    filters = { ...emptyFilters };
  for (const [k, v] of Object.entries(filterMap)) {
    const val = p.get(v);
    if (val !== null)
      filters[k] = Array.isArray(emptyFilters[k])
        ? val.split(",").filter(Boolean)
        : typeof emptyFilters[k] === "boolean"
          ? val === "1"
          : ["priceMin", "priceMax", "bedrooms", "beds", "bathrooms"].includes(
                k,
              )
            ? Number(val)
            : val;
  }
  const d = (s.destinations || []).find(
    (d) =>
      d.slug.toLowerCase() === slug.toLowerCase() ||
      d.name.toLowerCase() === slug.toLowerCase(),
  );
  return {
    query: d?.name || String(slug).replaceAll("--", ", ").replaceAll("-", " "),
    destinationId: d?.id || null,
    checkIn: p.get("checkin") || p.get("check_in"),
    checkOut: p.get("checkout") || p.get("check_out"),
    guests: Object.fromEntries(
      Object.keys(emptyGuests).map((k) => [
        k,
        Math.max(0, Number(p.get(k)) || 0),
      ]),
    ),
    flexible: p.get("flex")
      ? {
          length: p.get("flex"),
          months: (p.get("months") || "").split(",").filter(Boolean),
        }
      : null,
    dateFlex: Number(p.get("date_flex")) || 0,
    filters,
    sort: p.get("sort") || "recommended",
    page: Math.max(1, Number(p.get("page")) || 1),
  };
}
export function searchUrl(q, s = {}) {
  const p = new URLSearchParams(),
    d = (s.destinations || []).find(
      (d) =>
        d.id === q.destinationId ||
        d.name.toLowerCase() === q.query?.toLowerCase(),
    );
  if (q.checkIn) p.set("checkin", q.checkIn);
  if (q.checkOut) p.set("checkout", q.checkOut);
  for (const [k, v] of Object.entries(q.guests || {})) if (v) p.set(k, v);
  for (const [k, v] of Object.entries(q.filters || {}))
    if (v && (Array.isArray(v) ? v.length : v !== "any"))
      p.set(
        filterMap[k] || k,
        Array.isArray(v) ? v.join(",") : typeof v === "boolean" ? "1" : v,
      );
  if (q.flexible) {
    p.set("flex", q.flexible.length);
    if (q.flexible.months?.length) p.set("months", q.flexible.months.join(","));
  }
  if (q.dateFlex) p.set("date_flex", q.dateFlex);
  if (q.sort) p.set("sort", q.sort);
  if (q.page > 1) p.set("page", q.page);
  return `/s/${encodeURIComponent(d?.slug || q.query || "Anywhere")}/homes${p.size ? "?" + p : ""}`;
}
export const listingReviews = (s, id) =>
  (s.reviews || []).filter(
    (r) =>
      r.type === "guest_to_listing" &&
      r.listingId === id &&
      r.status === "published",
  );
export function listingRating(s, id) {
  const r = listingReviews(s, id);
  return r.length ? r.reduce((n, x) => n + (x.overall || 0), 0) / r.length : 0;
}
export function matchListings(s, q) {
  const f = { ...emptyFilters, ...q.filters },
    g = q.guests || {},
    text = (q.query || "").toLowerCase(),
    rows = (s.listings || []).filter((l) => {
      const d = (s.destinations || []).find((d) => d.id === l.destinationId),
        host = (s.users || []).find((u) => u.id === l.hostId);
      if (
        text &&
        text !== "anywhere" &&
        !(q.destinationId
          ? l.destinationId === q.destinationId
          : [
              l.city,
              l.title,
              l.region,
              l.country,
              d?.name,
              d?.region,
              d?.country,
            ].some((v) => v?.toLowerCase().includes(text)))
      )
        return false;
      if (
        (g.adults || 0) + (g.children || 0) > (l.maxGuests ?? 16) ||
        (g.pets > 0 && !l.allowsPets)
      )
        return false;
      if (q.checkIn && q.checkOut && !q.flexible) {
        const flex = q.dateFlex || 0;
        let valid = false;
        for (let offset = -flex; offset <= flex; offset++) {
          const a = new Date(q.checkIn + "T12:00"),
            b = new Date(q.checkOut + "T12:00");
          a.setDate(a.getDate() + offset);
          b.setDate(b.getDate() + offset);
          const fmt = (d) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (!availability(s, l, fmt(a), fmt(b))) {
            valid = true;
            break;
          }
        }
        if (!valid) return false;
      }
      if (f.category && !(l.categories || []).includes(f.category))
        return false;
      if (f.roomType !== "any" && f.roomType !== l.roomType) return false;
      if (
        (f.priceMin !== null && (l.nightlyPrice || 0) < f.priceMin) ||
        (f.priceMax !== null && (l.nightlyPrice || 0) > f.priceMax)
      )
        return false;
      if (
        (l.bedrooms || 0) < f.bedrooms ||
        (l.beds || 0) < f.beds ||
        (l.bathrooms || 0) < f.bathrooms
      )
        return false;
      if (!f.amenities.every((a) => (l.amenities || []).includes(a)))
        return false;
      for (const k of [
        "instantBook",
        "selfCheckIn",
        "allowsPets",
        "guestFavorite",
        "luxe",
      ])
        if (f[k] && !l[k]) return false;
      if (f.superhost && !host?.isSuperhost) return false;
      if (
        f.freeCancellation &&
        !["flexible", "moderate"].includes(l.cancellationPolicy)
      ) {
        if (!q.checkIn) return false;
        const p = computePrice(l, q.checkIn, q.checkOut || daysFromNow(30), g);
        if (
          computeRefund({
            checkIn: q.checkIn,
            createdAt: new Date().toISOString(),
            priceBreakdown: p,
            cancellationPolicy: l.cancellationPolicy,
            rateType: "refundable",
            status: "confirmed",
          }).tier !== "full"
        )
          return false;
      }
      if (
        f.propertyTypes.length &&
        !f.propertyTypes.includes(l.propertyTypeGroup)
      )
        return false;
      if (
        f.hostLanguages.length &&
        !f.hostLanguages.some((x) =>
          (l.languages || host?.languages || []).includes(x),
        )
      )
        return false;
      if (!f.accessibility.every((x) => (l.accessibility || []).includes(x)))
        return false;
      return true;
    });
  return rows.sort((a, b) =>
    q.sort === "price_low"
      ? (a.nightlyPrice || 0) - (b.nightlyPrice || 0)
      : q.sort === "price_high"
        ? (b.nightlyPrice || 0) - (a.nightlyPrice || 0)
        : q.sort === "rating"
          ? listingRating(s, b.id) - listingRating(s, a.id)
          : Number(!!b.guestFavorite) - Number(!!a.guestFavorite) ||
            listingRating(s, b.id) - listingRating(s, a.id) ||
            a.id.localeCompare(b.id),
  );
}
export const filterCount = (f) =>
  Object.entries(f || {}).filter(
    ([k, v]) => v && (Array.isArray(v) ? v.length : v !== "any"),
  ).length;
