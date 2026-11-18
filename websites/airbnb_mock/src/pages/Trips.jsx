import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useApp, systemMessage } from "../store/AppContext";
import { SidLink, useSidNavigate, NotFound } from "../components/navigation";
import {
  Button,
  Empty,
  Icon,
  Modal,
  Confirm,
  Field,
  Calendar,
  Guests,
} from "../components/ui";
import OfflineMap from "../components/OfflineMap";
import { PriceBreakdown, roomUrl } from "../components/ListingCard";
import {
  computeRefund,
  computePrice,
  dateRange,
  fmtDate,
  guestText,
  money,
  tripGroup,
  tripStatus,
  daysFromNow,
  nightsBetween,
  policyText,
  genId,
  round2,
  availability,
} from "../utils/pricing";
const stayDateTime = (date, time) => {
  if (!date) return "Add dates";
  const value = new Date(`${date}T${time}`);
  return `${value.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${value.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};
export const cancellationReasons = [
  ["my_plans_changed", "My travel plans changed"],
  ["found_another_place", "I found a different place to stay"],
  ["need_change_dates", "I need to change dates or the number of guests"],
  ["host_asked_cancel", "The host asked me to cancel"],
  ["extenuating", "I have an emergency or unavoidable event"],
  ["other", "Other"],
];
export function Withdraw({ reservation: r, onClose }) {
  const { actions } = useApp();
  return (
    <Confirm
      title="Withdraw your request?"
      label="Withdraw"
      cancelLabel="Keep request"
      onClose={onClose}
      onConfirm={() => {
        actions.cancel(r.id, "withdrawn", "Request withdrawn", "", true);
        onClose();
      }}
    >
      <p>The host won’t be able to accept it, and you won’t be charged.</p>
    </Confirm>
  );
}
function CalendarDownload({ reservation: r, listing: l }) {
  const download = () => {
    const blob = new Blob(
      [
        `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Airbnb//Trips//EN\r\nBEGIN:VEVENT\r\nUID:${r.id}@airbnb\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, "")}\r\nDTSTART;VALUE=DATE:${r.checkIn.replaceAll("-", "")}\r\nDTEND;VALUE=DATE:${r.checkOut.replaceAll("-", "")}\r\nSUMMARY:${(l.title || "Airbnb stay").replace(/[,;\n]/g, " ")}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`,
      ],
      { type: "text/calendar" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "airbnb-trip.ics";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button onClick={download}>
      <Icon name="CalendarPlus" size={18} />
      Add to calendar
    </Button>
  );
}
export function Trips() {
  const { state, reviewsDue, update, notify } = useApp(),
    [tab, setTab] = useState("Upcoming"),
    rows = state.reservations
      .filter((r) => tripGroup(r) === tab)
      .sort((a, b) =>
        tab === "Upcoming"
          ? a.checkIn.localeCompare(b.checkIn)
          : b.checkIn.localeCompare(a.checkIn),
      );
  const activityBookings = state.experienceBookings.filter((b) =>
    tab === "Cancelled"
      ? b.status === "cancelled"
      : tab === "Upcoming"
        ? b.status === "confirmed"
        : false,
  );
  return (
    <main className="page trips-page">
      <h1>Trips</h1>
      <div className="tabs">
        {["Upcoming", "Past", "Cancelled"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t} ({state.reservations.filter((r) => tripGroup(r) === t).length})
          </button>
        ))}
      </div>
      {tab === "Past" && <h2>Where you’ve been</h2>}
      <div className={`trip-list ${tab === "Past" ? "past" : ""}`}>
        {rows.map((r) => {
          const l = state.listings.find((l) => l.id === r.listingId),
            host = state.users.find((u) => u.id === r.hostId),
            review = state.reviews.find(
              (v) =>
                v.reservationId === r.id &&
                v.authorId === "user_001" &&
                v.status === "published",
            );
          return (
            <article className="trip-card" key={r.id}>
              <SidLink to={`/trips/${r.id}`} className="trip-card-main">
                {l?.photos?.[0] ? (
                  <img src={l.photos[0]} alt={l.title} />
                ) : (
                  <div className="missing-photo">
                    <Icon name="House" />
                  </div>
                )}
                <div>
                  <span
                    className={`status ${r.status === "pending" ? "pending" : ""}`}
                  >
                    {tripStatus(r)}
                  </span>
                  <h2>{l?.city || "Your stay"}</h2>
                  <p>Hosted by {host?.firstName || "your host"}</p>
                  <p>
                    {dateRange(r.checkIn, r.checkOut)}, {r.checkIn?.slice(0, 4)}
                  </p>
                  {tab === "Upcoming" && (
                    <small>
                      {nightsBetween(daysFromNow(0), r.checkIn) > 0
                        ? `In ${nightsBetween(daysFromNow(0), r.checkIn)} days`
                        : "Enjoy your stay"}
                    </small>
                  )}
                  {r.cancellation && r.amountPaid > 0 && (
                    <p>Refunded {money(r.cancellation.refundAmount)}</p>
                  )}
                </div>
                <Icon name="ChevronRight" />
              </SidLink>
              {reviewsDue.some((x) => x.id === r.id) && (
                <SidLink
                  className="review-due-link"
                  to={`/reviews/write/${r.id}`}
                >
                  Write a review
                </SidLink>
              )}
              {tab === "Past" && review && (
                <small>Reviewed ★{review.overall}</small>
              )}
              {tab === "Cancelled" && l && (
                <SidLink className="text" to={roomUrl(l)}>
                  Book again
                </SidLink>
              )}
            </article>
          );
        })}
      </div>
      {!rows.length && !activityBookings.length && (
        <Empty
          title={
            tab === "Cancelled"
              ? "You don’t have any cancelled trips"
              : "No trips booked…yet!"
          }
        >
          <p>
            Time to dust off your bags and start planning your next adventure.
          </p>
          <SidLink className="btn dark" to="/">
            Start searching
          </SidLink>
        </Empty>
      )}
      {activityBookings.length > 0 && (
        <section>
          <h2>Experiences & services</h2>
          {activityBookings.map((b) => {
            const kind = b.kind === "service" ? "services" : "experiences",
              item = state[kind].find(
                (i) => i.id === (b.serviceId || b.experienceId),
              ),
              slot = item?.slots?.find((x) => x.id === b.slotId);
            return (
              <article className="activity-trip row" key={b.id}>
                {item?.photo && (
                  <img className="thumb" src={item.photo} alt="" />
                )}
                <div>
                  <SidLink to={`/${kind}/${item?.id}`}>
                    <strong>{item?.title || "Your experience"}</strong>
                  </SidLink>
                  <p>
                    {b.kind === "service" ? "Service" : "Experience"} ·{" "}
                    {fmtDate(slot?.date)} · {money(b.total)}
                  </p>
                </div>
                {b.status === "confirmed" && (
                  <Button
                    onClick={() => {
                      update((s) => {
                        const booking = s.experienceBookings.find(
                          (x) => x.id === b.id,
                        );
                        booking.status = "cancelled";
                        booking.cancelledAt = new Date().toISOString();
                        const target = s[kind]
                          .find((x) => x.id === item?.id)
                          ?.slots?.find((x) => x.id === b.slotId);
                        if (target) target.spotsLeft += b.guests;
                      });
                      notify("Booking cancelled");
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
export function TripDetail({ confirmation = false, receipt = false }) {
  const { id } = useParams(),
    { state } = useApp(),
    r = state.reservations.find((r) => r.id === id),
    [modal, setModal] = useState(null);
  if (!r) return <NotFound />;
  const l = state.listings.find((l) => l.id === r.listingId) || {
      id: r.listingId,
      title: "Your stay",
    },
    host = state.users.find((u) => u.id === r.hostId),
    payment = state.paymentMethods.find((p) => p.id === r.paymentMethodId),
    upcoming = r.checkOut >= daysFromNow(0),
    canCancel = r.status === "confirmed" && upcoming;
  if (receipt)
    return (
      <main className="page narrow receipt">
        <div className="row between">
          <h1>Your receipt from Airbnb</h1>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
        <p>Receipt ID: RC{r.confirmationCode}</p>
        <p>
          Booked by {state.currentUser.firstName} {state.currentUser.lastName}
        </p>
        <h2>{l.title}</h2>
        <p>
          {dateRange(r.checkIn, r.checkOut)} · {guestText(r.guests)}
        </p>
        <PriceBreakdown price={r.priceBreakdown} />
        <h2>Payment</h2>
        <p>
          {payment?.brand || payment?.type || "Card"}{" "}
          {payment?.last4 ? "•••• " + payment.last4 : ""} ·{" "}
          {money(r.amountPaid)} · {fmtDate(r.createdAt)}
        </p>
        {r.cancellation && (
          <>
            <h2>Refunds</h2>
            <p>
              {money(r.cancellation.refundAmount)} refunded ·{" "}
              {fmtDate(r.cancellation.cancelledAt)}
            </p>
          </>
        )}
        <SidLink className="text" to={`/trips/${id}`}>
          Back to trip
        </SidLink>
      </main>
    );
  return (
    <main className="page narrow trip-detail">
      {confirmation ? (
        <>
          <h1 className={r.status === "confirmed" ? "confirmed-title" : ""}>
            {r.status === "pending"
              ? "Request sent"
              : r.status === "confirmed"
                ? "Your reservation is confirmed"
                : tripStatus(r)}
          </h1>
          <p>
            {r.status === "pending"
              ? "Your reservation won’t be confirmed until the Host accepts your request (within 24 hours). You won’t be charged until then."
              : `You’re going to ${l.city || "your next adventure"}!`}
          </p>
        </>
      ) : (
        <>
          <SidLink className="text" to="/trips">
            <Icon name="ChevronLeft" size={16} />
            Trips
          </SidLink>
          <h1>{l.city || "Your trip"}</h1>
        </>
      )}
      <div className="trip-detail-columns">
        <div>
          {l.photos?.[0] && (
            <img className="trip-hero" src={l.photos[0]} alt={l.title} />
          )}
          <h2>{l.title}</h2>
          <span className={`status ${r.status === "pending" ? "pending" : ""}`}>
            {tripStatus(r)}
          </span>
          <section className="two">
            <div>
              <strong>Check-in</strong>
              <p>
                {stayDateTime(r.checkIn, l.houseRules?.checkInFrom || "15:00")}
              </p>
            </div>
            <div>
              <strong>Checkout</strong>
              <p>
                {stayDateTime(r.checkOut, l.houseRules?.checkOutBy || "11:00")}
              </p>
            </div>
          </section>
          <section>
            <h2>Reservation details</h2>
            <p>
              <strong>Who’s coming</strong>
              <br />
              {guestText(r.guests)}
            </p>
            <div className="row between">
              <p>
                <strong>Confirmation code</strong>
                <br />
                {r.confirmationCode}
              </p>
              <Button
                onClick={() =>
                  navigator.clipboard
                    .writeText(r.confirmationCode || "")
                    .then(() => setModal("copied"))
                    .catch(() => setModal("code"))
                }
              >
                Copy code
              </Button>
            </div>
            <p>{policyText(r.cancellationPolicy, r.checkIn, r.rateType)}</p>
            <SidLink className="text" to={`/trips/${id}/receipt`}>
              Get receipt
            </SidLink>
          </section>
          <section>
            <h2>Getting there</h2>
            <p>
              {r.status === "pending"
                ? "The exact address is shared after confirmation."
                : l.address || l.city}
            </p>
            <Button onClick={() => setModal("map")}>Get directions</Button>
            <h3>Where you’re staying</h3>
            <SidLink className="text" to={roomUrl(l)}>
              Show listing
            </SidLink>
          </section>
          <section>
            <h2>Hosted by {host?.firstName || "your host"}</h2>
            <div className="chips">
              {r.conversationId && (
                <SidLink
                  className="btn dark"
                  to={`/messages/${r.conversationId}`}
                >
                  Message host
                </SidLink>
              )}
              <Button onClick={() => setModal("phone")}>Call host</Button>
            </div>
          </section>
          <section>
            <h2>Payment info</h2>
            <div className="row between">
              <span>Total cost</span>
              <strong>{money(r.priceBreakdown?.total)}</strong>
            </div>
            <p>Amount paid: {money(r.amountPaid)}</p>
            <p>
              {payment?.type === "paypal"
                ? "PayPal"
                : `${payment?.brand || "Card"} •••• ${payment?.last4 || "—"}`}
            </p>
            {r.paymentPlan === "split" && (
              <p>
                Remaining{" "}
                {money((r.priceBreakdown?.total || 0) - (r.amountPaid || 0))}{" "}
                due 14 days before check-in.
              </p>
            )}
          </section>
          {r.cancellation && (
            <section>
              <h2>{tripStatus(r)}</h2>
              <p>{r.cancellation.reasonText}</p>
              <p>
                Refund: {money(r.cancellation.refundAmount)} ·{" "}
                {r.cancellation.refundTier}
              </p>
            </section>
          )}
          <div className="chips">
            {confirmation && (
              <SidLink className="btn dark" to={`/trips/${id}`}>
                View trip
              </SidLink>
            )}
            {canCancel && (
              <>
                <SidLink className="btn outline" to={`/trips/${id}/change`}>
                  Change reservation
                </SidLink>
                <SidLink className="btn outline" to={`/trips/${id}/cancel`}>
                  Cancel reservation
                </SidLink>
              </>
            )}
            {r.status === "pending" && (
              <Button onClick={() => setModal("withdraw")}>
                Withdraw request
              </Button>
            )}
            {r.status === "confirmed" && (
              <CalendarDownload reservation={r} listing={l} />
            )}
          </div>
        </div>
        <aside className="trip-map">
          <OfflineMap listings={[l]} query={{ query: l.city }} />
        </aside>
      </div>
      {modal === "withdraw" && (
        <Withdraw reservation={r} onClose={() => setModal(null)} />
      )}
      {modal === "map" && (
        <Modal title="Getting there" onClose={() => setModal(null)}>
          <p>{l.address || l.city}</p>
          <div className="location-map">
            <OfflineMap listings={[l]} />
          </div>
        </Modal>
      )}
      {["phone", "copied", "code"].includes(modal) && (
        <Modal
          title={
            modal === "phone"
              ? "Call your host"
              : modal === "copied"
                ? "Code copied"
                : "Confirmation code"
          }
          onClose={() => setModal(null)}
        >
          <p>
            {modal === "phone"
              ? host?.phone || "+1 (415) 555-0124"
              : r.confirmationCode}
          </p>
        </Modal>
      )}
    </main>
  );
}
export function CancelTrip() {
  const { id } = useParams(),
    { state, actions } = useApp(),
    nav = useSidNavigate(),
    r = state.reservations.find((r) => r.id === id),
    [step, setStep] = useState(1),
    [reason, setReason] = useState(""),
    [reasonText, setText] = useState(""),
    [note, setNote] = useState("");
  if (!r) return <NotFound />;
  const l = state.listings.find((l) => l.id === r.listingId),
    refund = computeRefund(r),
    payment = state.paymentMethods.find((p) => p.id === r.paymentMethodId),
    paymentLabel = payment?.type === "paypal" ? "PayPal" : payment
      ? `${payment.brand || "Card"} •••• ${payment.last4 || ""}` : "your original payment method",
    deadline = new Date(r.checkIn + "T15:00:00");
  deadline.setDate(deadline.getDate() - ({ flexible: 1, moderate: 5, limited: 14, firm: 30 }[r.cancellationPolicy] || 0));
  if (r.status === "pending")
    return (
      <main className="page cancel-page">
        <Withdraw reservation={r} onClose={() => nav(`/trips/${id}`)} />
      </main>
    );
  if (r.status !== "confirmed" || r.checkOut < daysFromNow(0))
    return (
      <main className="page cancel-page">
        <h1>
          {r.status === "cancelled"
            ? "Your reservation is cancelled"
            : "This reservation cannot be cancelled"}
        </h1>
        {r.cancellation && (
          <p>Your refund: {money(r.cancellation.refundAmount)}</p>
        )}
        <SidLink className="btn dark" to="/trips">
          Back to trips
        </SidLink>
      </main>
    );
  return (
    <main className="page cancel-page">
      <div className="progress">
        <i style={{ width: step * 50 + "%" }} />
      </div>
      <h1>
        {step === 1 ? "Why do you need to cancel?" : "Confirm cancellation"}
      </h1>
      {step === 1 ? (
        <>
          {cancellationReasons.map(([v, label]) => (
            <label className="radio-card" key={v}>
              <span>{label}</span>
              <input
                type="radio"
                name="reason"
                checked={reason === v}
                onChange={() => setReason(v)}
              />
            </label>
          ))}
          {reason === "other" && (
            <Field
              label="Tell us why"
              as="textarea"
              value={reasonText}
              onChange={(e) => setText(e.target.value)}
              required
            />
          )}
          <div className="row between">
            <SidLink className="text" to={`/trips/${id}`}>
              Back
            </SidLink>
            <Button
              variant="dark"
              disabled={!reason || (reason === "other" && !reasonText.trim())}
              onClick={() => setStep(2)}
            >
              Next
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="row">
            {l?.photos?.[0] && (
              <img className="thumb" src={l.photos[0]} alt="" />
            )}
            <div>
              <strong>{l?.title || "Your stay"}</strong>
              <p>{dateRange(r.checkIn, r.checkOut)}</p>
            </div>
          </div>
          <h2>Refund details</h2>
          <div className="row between">
            <p>You paid</p>
            <strong>{money(r.amountPaid)}</strong>
          </div>
          <div className="row between">
            <p>Your total refund</p>
            <strong>{money(refund.refundAmount)}</strong>
          </div>
          <p>
            {refund.tier === "full"
              ? r.cancellationPolicy === "strict"
                ? "Full refund: you’re cancelling within 48 hours of booking."
                : `Full refund: you’re cancelling before ${fmtDate(deadline.toISOString())}.`
              : refund.tier === "partial"
                ? "Partial refund: 50% of the nightly rate plus the cleaning fee and eligible taxes."
                : "Non-refundable: only the cleaning and pet fees are refunded before check-in."}
          </p>
          <p className="muted">
            Refunds go back to {paymentLabel} within 5–7 business days.
          </p>
          <Field
            label="Message for your host (optional)"
            as="textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="row between">
            <Button variant="text" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              variant="dark"
              onClick={() =>
                actions.cancel(
                  id,
                  reason,
                  reason === "other"
                    ? reasonText
                    : cancellationReasons.find((x) => x[0] === reason)?.[1],
                  note,
                )
              }
            >
              Cancel reservation
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
export function ChangeTrip() {
  const { id } = useParams(),
    { state, update, notify } = useApp(),
    nav = useSidNavigate(),
    r = state.reservations.find((r) => r.id === id),
    l = state.listings.find((l) => l.id === r?.listingId),
    [draft, setDraft] = useState(() =>
      r ? { checkIn: r.checkIn, checkOut: r.checkOut, guests: r.guests } : {},
    ),
    [confirm, setConfirm] = useState(false);
  if (!r || !l) return <NotFound />;
  if (r.status !== "confirmed" || r.checkOut < daysFromNow(0))
    return (
      <main className="page">
        <h1>This reservation cannot be changed</h1>
        <SidLink to={`/trips/${id}`}>View trip</SidLink>
      </main>
    );
  const p = computePrice(
      l,
      draft.checkIn,
      draft.checkOut,
      draft.guests,
      r.rateType,
    ),
    diff = round2(p.total - (r.priceBreakdown?.total || 0)),
    error =
      availability(state, l, draft.checkIn, draft.checkOut, id) ||
      ((draft.guests?.adults || 0) < 1 ? "At least one adult is required" : "");
  return (
    <main className="page narrow">
      <h1>Change reservation</h1>
      <h2>{l.title}</h2>
      <Calendar
        {...draft}
        onChange={(d) => setDraft({ ...draft, ...d })}
        blocked={(l.blockedRanges || []).concat(
          state.reservations
            .filter(
              (x) =>
                x.id !== id &&
                x.listingId === l.id &&
                ["pending", "confirmed"].includes(x.status),
            )
            .map((x) => ({ start: x.checkIn, end: x.checkOut })),
        )}
        minNights={l.minNights}
      />
      <Guests
        value={draft.guests}
        onChange={(guests) => setDraft({ ...draft, guests })}
        max={l.maxGuests}
        allowsPets={l.allowsPets}
      />
      {error && <p className="error-text">{error}</p>}
      <p>
        {diff >= 0
          ? `You’ll pay ${money(diff)} more`
          : `You’ll get ${money(-diff)} back`}
      </p>
      <Button
        variant="dark"
        disabled={!draft.checkIn || !draft.checkOut || !!error}
        onClick={() => setConfirm(true)}
      >
        Request change
      </Button>
      {confirm && (
        <Confirm
          title="Confirm reservation change"
          label="Confirm change"
          onClose={() => setConfirm(false)}
          onConfirm={() => {
            update((s) => {
              const x = s.reservations.find((x) => x.id === id),
                now = new Date().toISOString();
              x.alterations ??= [];
              x.alterations.push({
                id: genId("alt"),
                actorId: "user_001",
                from: {
                  checkIn: x.checkIn,
                  checkOut: x.checkOut,
                  guests: x.guests,
                },
                to: draft,
                priceDiff: diff,
                status: "accepted",
                createdAt: now,
              });
              Object.assign(x, draft, {
                nights: p.nights,
                priceBreakdown: p,
                amountPaid: round2(Math.max(0, (x.amountPaid || 0) + diff)),
              });
              s.messages.push(
                systemMessage(
                  x.conversationId,
                  "Reservation changed · " +
                    dateRange(draft.checkIn, draft.checkOut),
                  now,
                ),
              );
              const c = s.conversations.find((c) => c.id === x.conversationId);
              if (c) c.lastMessageAt = now;
            });
            notify("Reservation changed");
            nav(`/trips/${id}`);
          }}
        >
          <p>
            {dateRange(draft.checkIn, draft.checkOut)} ·{" "}
            {guestText(draft.guests)}
          </p>
          <PriceBreakdown price={p} />
        </Confirm>
      )}
    </main>
  );
}
