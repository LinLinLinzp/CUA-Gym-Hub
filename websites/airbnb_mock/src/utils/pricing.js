export const DAY = 86400000;
export const SERVICE_FEE_RATE = 0.142;
export const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const daysFromNow = (n) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const isoDaysAgo = (n, hour = 10, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};
export const genId = (p) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
export const genConfirmationCode = () =>
  `HM${Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("")}`;
export const nightsBetween = (a, b) =>
  Math.round((new Date(b + "T12:00") - new Date(a + "T12:00")) / DAY);
export function computePrice(l, a, b, g = {}, rateType = "refundable") {
  const nights = Math.max(0, nightsBetween(a, b) || 0),
    nightsSubtotal = round2((l.nightlyPrice || 0) * nights);
  const discountPct =
    nights >= 28
      ? l.monthlyDiscountPct || 0
      : nights >= 7
        ? l.weeklyDiscountPct || 0
        : 0;
  let discount = round2((nightsSubtotal * discountPct) / 100);
  if (rateType === "non_refundable")
    discount = round2(discount + (nightsSubtotal - discount) * 0.1);
  const cleaningFee = l.cleaningFee || 0,
    petFee = g?.pets > 0 ? l.petFee || 0 : 0,
    taxable = nightsSubtotal - discount + cleaningFee + petFee;
  const serviceFee = round2(taxable * SERVICE_FEE_RATE),
    taxes = round2(taxable * (l.taxRate || 0));
  return {
    nightlyRate: l.nightlyPrice || 0,
    nights,
    nightsSubtotal,
    discount,
    discountPct,
    cleaningFee,
    petFee,
    serviceFee,
    taxes,
    total: round2(taxable + serviceFee + taxes),
    currency: "USD",
  };
}
export function computeRefund(r, now = new Date()) {
  const daysBefore = (new Date(r.checkIn + "T15:00:00") - now) / DAY,
    hoursSinceBooking = (now - new Date(r.createdAt)) / 3600000,
    p = r.priceBreakdown || {},
    base = (p.nightsSubtotal || 0) - (p.discount || 0);
  let tier = "none";
  if (r.status === "pending") tier = "full";
  else if (r.rateType !== "non_refundable")
    switch (r.cancellationPolicy) {
      case "flexible":
        tier = daysBefore >= 1 ? "full" : "none";
        break;
      case "moderate":
        tier = daysBefore >= 5 ? "full" : "partial";
        break;
      case "limited":
        tier = daysBefore >= 14 ? "full" : daysBefore >= 7 ? "partial" : "none";
        break;
      case "firm":
        tier = daysBefore >= 30 ? "full" : daysBefore >= 7 ? "partial" : "none";
        break;
      case "strict":
        tier =
          hoursSinceBooking <= 48 && daysBefore >= 14
            ? "full"
            : daysBefore >= 7
              ? "partial"
              : "none";
        break;
    }
  if (daysBefore < 0) tier = "none";
  const refund =
    tier === "full"
      ? p.total || 0
      : tier === "partial"
        ? round2(
            base * 0.5 +
              (p.cleaningFee || 0) +
              (p.petFee || 0) +
              (p.taxes || 0) * 0.5,
          )
        : daysBefore >= 0
          ? round2((p.cleaningFee || 0) + (p.petFee || 0))
          : 0;
  const paid = r.amountPaid ?? p.total ?? 0,
    refundAmount = Math.min(refund, paid);
  return {
    tier,
    refundAmount: round2(refundAmount),
    nonRefundedAmount: round2(paid - refundAmount),
  };
}
export const defaultWeekend = () => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  const a = ymd(d);
  d.setDate(d.getDate() + 2);
  return { checkIn: a, checkOut: ymd(d) };
};
let displayCurrency = "USD";
const exchangeRates = { USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.37, MXN: 17.1 };
export const setDisplayCurrency = (currency) => {
  displayCurrency = exchangeRates[currency] ? currency : "USD";
};
export const money = (v, decimals = true, currency = displayCurrency) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: decimals ? 2 : 0,
    minimumFractionDigits: decimals ? 2 : 0,
  }).format((Number(v) || 0) * (exchangeRates[currency] || 1));
export const fmtDate = (d) =>
  d
    ? new Date(d.length === 10 ? d + "T12:00" : d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Add dates";
export const dateRange = (a, b) =>
  a && b ? `${fmtDate(a)} – ${fmtDate(b)}` : "Any week";
export const guestText = (g) => {
  const n = (g?.adults || 0) + (g?.children || 0);
  return `${n || 0} guest${n === 1 ? "" : "s"}${g?.infants ? `, ${g.infants} infant${g.infants > 1 ? "s" : ""}` : ""}${g?.pets ? `, ${g.pets} pet${g.pets > 1 ? "s" : ""}` : ""}`;
};
export const ratingKeys = [
  "cleanliness",
  "accuracy",
  "checkIn",
  "communication",
  "location",
  "value",
];
export function reviewDue(s, r) {
  return (
    r.status === "confirmed" &&
    r.checkOut < daysFromNow(0) &&
    nightsBetween(r.checkOut, daysFromNow(0)) <= 14 &&
    !(s.reviews || []).some(
      (v) =>
        v.reservationId === r.id &&
        v.authorId === "user_001" &&
        v.type === "guest_to_listing" &&
        v.status === "published",
    )
  );
}
export function availability(s, l, a, b, excludeId) {
  if (!a || !b) return "";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(a) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(b) ||
    !Number.isFinite(nightsBetween(a, b))
  )
    return "Choose valid dates";
  if (a < daysFromNow(0)) return "Check-in must be today or later";
  const n = nightsBetween(a, b);
  if (n < (l.minNights || 1))
    return `Minimum stay is ${l.minNights || 1} nights`;
  const ranges = [
    ...(l.blockedRanges || []),
    ...(s.reservations || [])
      .filter(
        (r) =>
          r.listingId === l.id &&
          r.id !== excludeId &&
          ["confirmed", "pending"].includes(r.status),
      )
      .map((r) => ({ start: r.checkIn, end: r.checkOut })),
  ];
  return ranges.some((r) => a < r.end && b > r.start)
    ? "Those dates are not available"
    : "";
}
export const policyText = (policy, a, rate) => {
  if (rate === "non_refundable") return "This reservation is non-refundable.";
  const days = { flexible: 1, moderate: 5, limited: 14, firm: 30 }[policy];
  if (!a)
    return `${(policy || "standard").replace(/^./, (x) => x.toUpperCase())} cancellation policy. Select dates for details.`;
  const d = new Date(a + "T12:00");
  d.setDate(d.getDate() - (days || 7));
  return policy === "strict"
    ? `Free cancellation for 48 hours if booked at least 14 days before check-in. Cancel before ${fmtDate(ymd(d))} for a partial refund.`
    : `Free cancellation before ${fmtDate(ymd(d))}. Cancel before check-in for a partial refund.`;
};
export const tripGroup = (r) =>
  ["cancelled", "withdrawn", "declined"].includes(r.status)
    ? "Cancelled"
    : r.checkOut < daysFromNow(0)
      ? "Past"
      : "Upcoming";
export const tripStatus = (r) =>
  r.status === "pending"
    ? "Request pending"
    : r.status === "withdrawn"
      ? "Request withdrawn"
      : r.status === "declined"
        ? "Request declined"
        : r.status === "cancelled"
          ? `Cancelled by ${r.cancellation?.cancelledBy === "user_001" ? "you" : "host"}`
          : r.checkOut < daysFromNow(0)
            ? "Completed"
            : r.checkOut === daysFromNow(0)
              ? "Checking out today"
              : r.checkIn <= daysFromNow(0)
                ? "Currently hosted"
                : "Confirmed";
