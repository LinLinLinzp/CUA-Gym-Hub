import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { SidLink, useSidNavigate, NotFound } from "../components/navigation";
import {
  Button,
  Field,
  CardForm,
  validateCard,
  cardRecord,
  Modal,
  Avatar,
  Icon,
} from "../components/ui";
import { TripEditor } from "./Listing";
import { roomUrl, PriceBreakdown } from "../components/ListingCard";
import { readSearch } from "../utils/search";
import {
  computePrice,
  availability,
  guestText,
  dateRange,
  money,
  round2,
  nightsBetween,
  daysFromNow,
  policyText,
} from "../utils/pricing";
export default function Checkout() {
  const { id } = useParams(),
    { state, actions, listingRating, listingReviewCount } = useApp(),
    loc = useLocation(),
    nav = useSidNavigate(),
    l = state.listings.find((l) => l.id === id),
    q = readSearch(new URLSearchParams(loc.search)),
    [modal, setModal] = useState(null),
    [rateType, setRate] = useState("refundable"),
    [plan, setPlan] = useState("full"),
    [method, setMethod] = useState(
      state.paymentMethods.find((p) => p.isDefault)?.id ||
        state.paymentMethods[0]?.id ||
        "new",
    ),
    [card, setCard] = useState({}),
    [errors, setErrors] = useState({}),
    [message, setMessage] = useState(""),
    [phone, setPhone] = useState(state.currentUser.phone || ""),
    [loading, setLoading] = useState(false),
    submitted = useRef(false);
  const invalid =
    l &&
    (!q.checkIn ||
      !q.checkOut ||
      !q.guests.adults ||
      availability(state, l, q.checkIn, q.checkOut) ||
      q.guests.adults + q.guests.children > (l.maxGuests || 16) ||
      (q.guests.pets > 0 && !l.allowsPets));
  useEffect(() => {
    if (invalid) nav(roomUrl(l, q), { replace: true });
  }, [invalid]);
  if (!l) return <NotFound />;
  if (invalid)
    return (
      <main className="page">
        Choose available dates and guests to continue.
      </main>
    );
  const price = computePrice(l, q.checkIn, q.checkOut, q.guests, rateType),
    splitAllowed = nightsBetween(daysFromNow(0), q.checkIn) >= 14,
    payment = state.paymentMethods.find((p) => p.id === method),
    host = state.users.find((u) => u.id === l.hostId);
  function submit(e) {
    e.preventDefault();
    if (submitted.current) return;
    const errs = method === "new" ? validateCard(card) : {};
    if (!l.instantBook && !message.trim()) errs.message = "Required";
    if (phone.replace(/\D/g, "").length < 7)
      errs.phone = "Enter a valid phone number";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    submitted.current = true;
    setLoading(true);
    setTimeout(() => {
      const rid = actions.book(id, q, {
        rateType,
        paymentPlan: splitAllowed ? plan : "full",
        paymentMethodId: method === "new" ? null : method,
        card: method === "new" ? cardRecord(card) : null,
        phone,
        message,
      });
      nav(`/trips/${rid}/confirmation`);
    }, 1200);
  }
  const edit = (next) => {
    if (nightsBetween(daysFromNow(0), next.checkIn) < 14) setPlan("full");
    nav(roomUrl(l, next).replace("/rooms/", "/book/stays/"), { replace: true });
    setModal(null);
  };
  return (
    <main className="page narrow checkout-page">
      <div className="row">
        <SidLink
          className="icon-btn"
          to={roomUrl(l, q)}
          aria-label="Back to listing"
        >
          <Icon name="ChevronLeft" />
        </SidLink>
        <h1>{l.instantBook ? "Confirm and pay" : "Request to book"}</h1>
      </div>
      <div className="checkout-columns">
        <form onSubmit={submit} noValidate>
          <section>
            {l.guestFavorite && (
              <div className="rare-find">
                <Icon name="Gem" color="#e31c5f" />
                <div>
                  <strong>This is a rare find</strong>
                  <p>{host?.firstName}’s place is usually booked.</p>
                </div>
              </div>
            )}
            <h2>Your trip</h2>
            <div className="row between">
              <div>
                <strong>Dates</strong>
                <p>{dateRange(q.checkIn, q.checkOut)}</p>
              </div>
              <Button
                type="button"
                variant="text"
                onClick={() => setModal("dates")}
              >
                Edit dates
              </Button>
            </div>
            <div className="row between">
              <div>
                <strong>Guests</strong>
                <p>{guestText(q.guests)}</p>
              </div>
              <Button
                type="button"
                variant="text"
                onClick={() => setModal("guests")}
              >
                Edit guests
              </Button>
            </div>
          </section>
          {l.nonRefundableOption && (
            <section>
              <h2>Choose a rate</h2>
              {[
                ["refundable", "Refundable"],
                ["non_refundable", "Non-refundable"],
              ].map(([value, label]) => (
                <label
                  className={`radio-card ${rateType === value ? "selected" : ""}`}
                  key={value}
                >
                  <div>
                    <strong>
                      {label} ·{" "}
                      {money(
                        computePrice(l, q.checkIn, q.checkOut, q.guests, value)
                          .total,
                      )}
                    </strong>
                    <p>
                      {value === "refundable"
                        ? policyText(l.cancellationPolicy, q.checkIn)
                        : "Save 10% on the nightly rate. No refund of nightly charges."}
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="rate"
                    checked={rateType === value}
                    onChange={() => setRate(value)}
                  />
                </label>
              ))}
            </section>
          )}
          <section>
            <h2>Choose how to pay</h2>
            <label className="radio-card">
              <div>
                <strong>Pay {money(price.total)} now</strong>
              </div>
              <input
                type="radio"
                name="plan"
                checked={plan === "full"}
                onChange={() => setPlan("full")}
              />
            </label>
            {splitAllowed && (
              <label className="radio-card">
                <div>
                  <strong>Pay part now, part later</strong>
                  <p>
                    {money(round2(price.total * 0.5))} due today,{" "}
                    {money(round2(price.total - round2(price.total * 0.5)))} due
                    14 days before check-in. No extra fees.
                  </p>
                </div>
                <input
                  type="radio"
                  name="plan"
                  checked={plan === "split"}
                  onChange={() => setPlan("split")}
                />
              </label>
            )}
          </section>
          <section>
            <h2>Pay with</h2>
            <Field
              label="Payment method"
              as="select"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {state.paymentMethods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.type === "paypal"
                    ? "PayPal · " + p.email
                    : `${p.brand || "Card"} •••• ${p.last4 || ""}`}
                </option>
              ))}
              <option value="new">Add credit or debit card</option>
            </Field>
            {method === "new" && (
              <CardForm value={card} onChange={setCard} errors={errors} />
            )}
            {payment?.type === "paypal" && (
              <p>You’ll log in to PayPal to complete payment.</p>
            )}
          </section>
          <section>
            <h2>Required for your trip</h2>
            <div className="row">
              <Avatar user={host} />
              <div>
                <strong>Message the host</strong>
                <small>
                  Hosted by {host?.firstName || "your host"} · Joined in{" "}
                  {host?.joinedAt?.slice(0, 4) || "2020"}
                </small>
              </div>
            </div>
            <p className="muted">
              Let the host know why you’re traveling and when you’ll check in.
            </p>
            <Field
              as="textarea"
              label={
                l.instantBook
                  ? "Message the host (optional)"
                  : "Message the host (required)"
              }
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              error={errors.message}
            />
            <Field
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
            />
          </section>
          <section>
            <h2>Cancellation policy</h2>
            <p>{policyText(l.cancellationPolicy, q.checkIn, rateType)}</p>
            <Button
              type="button"
              variant="text"
              onClick={() => setModal("policy")}
            >
              Learn more
            </Button>
          </section>
          <section>
            <h2>Ground rules</h2>
            <p>
              We ask every guest to remember a few simple things about what
              makes a great guest.
            </p>
            <ul>
              <li>Follow the house rules</li>
              <li>Treat your Host’s home like your own</li>
            </ul>
            <p className="legal">
              By selecting the button below, I agree to the Host’s House Rules,
              Ground rules for guests, and Airbnb’s Rebooking and Refund Policy.
            </p>
            <Button className="full" variant="brand" disabled={loading}>
              {loading
                ? "Confirming…"
                : l.instantBook
                  ? "Confirm and pay"
                  : "Request to book"}
            </Button>
          </section>
        </form>
        <aside>
          <div className="checkout-summary">
            <div className="row">
              <img className="thumb" src={l.photos?.[0]} alt={l.title} />
              <div>
                <strong>{l.title}</strong>
                <small>
                  {l.propertyType} · ★ {listingRating(id).toFixed(2)} (
                  {listingReviewCount(id)})
                  {host?.isSuperhost ? " · Superhost" : ""}
                </small>
              </div>
            </div>
            <hr />
            <h2>Price details</h2>
            {rateType === "non_refundable" && (
              <p>Non-refundable discount −{money(price.discount)}</p>
            )}
            <PriceBreakdown price={price} />
          </div>
        </aside>
      </div>
      {["dates", "guests"].includes(modal) && (
        <TripEditor
          q={q}
          listing={l}
          kind={modal}
          onSave={edit}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "policy" && (
        <Modal title="Cancellation policy" onClose={() => setModal(null)}>
          <p>{policyText(l.cancellationPolicy, q.checkIn, rateType)}</p>
          <p>
            Refunds are calculated from the time you cancel. Cleaning and pet
            fees are refunded before check-in. The Airbnb service fee is
            refunded only when the policy offers a full refund.
          </p>
        </Modal>
      )}
    </main>
  );
}
