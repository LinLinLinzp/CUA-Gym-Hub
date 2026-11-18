import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { useSidNavigate, SidLink, NotFound } from "../components/navigation";
import { useSave } from "../components/SaveWishlist";
import {
  Avatar,
  Button,
  Calendar,
  Guests,
  Icon,
  Modal,
  Share,
  Field,
} from "../components/ui";
import { PriceBreakdown, roomUrl } from "../components/ListingCard";
import OfflineMap from "../components/OfflineMap";
import ReviewsDisplay from "../components/ReviewsDisplay";
import { Carousel } from "./Browse";
import { readSearch, emptyGuests } from "../utils/search";
import {
  computePrice,
  availability,
  guestText,
  money,
  fmtDate,
  dateRange,
  policyText,
  genId,
} from "../utils/pricing";
export function TripEditor({
  q,
  listing,
  onSave,
  onClose,
  kind = "dates",
  excludeId,
}) {
  const { unavailableNights, state } = useApp(),
    [draft, setDraft] = useState(() => ({
      ...q,
      guests: { ...emptyGuests, ...q.guests, adults: Math.max(1, q.guests?.adults || 0) },
    })),
    error = availability(
      state,
      listing,
      draft.checkIn,
      draft.checkOut,
      excludeId,
    );
  return (
    <Modal
      title={kind === "dates" ? "Edit dates" : "Edit guests"}
      wide={kind === "dates"}
      onClose={onClose}
      footer={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="dark"
            disabled={
              kind === "dates"
                ? !draft.checkIn || !draft.checkOut || !!error
                : !draft.guests?.adults
            }
            onClick={() => onSave(draft)}
          >
            Save
          </Button>
        </>
      }
    >
      {kind === "dates" ? (
        <>
          <Calendar
            checkIn={draft.checkIn}
            checkOut={draft.checkOut}
            onChange={(d) => setDraft({ ...draft, ...d })}
            blocked={unavailableNights(listing.id).filter(
              (r) =>
                !excludeId ||
                r.start !==
                  state.reservations.find((x) => x.id === excludeId)?.checkIn,
            )}
            minNights={listing.minNights}
          />
          {error && <p className="error-text">{error}</p>}
        </>
      ) : (
        <>
          <Guests
            value={draft.guests}
            onChange={(guests) => setDraft({ ...draft, guests })}
            max={listing.maxGuests || 16}
            allowsPets={listing.allowsPets}
          />
          <small>
            This place has a maximum of {listing.maxGuests || 16} guests, not
            including infants.
          </small>
        </>
      )}
    </Modal>
  );
}
export function PhotoTour() {
  const { id } = useParams(),
    { state } = useApp(),
    nav = useSidNavigate(),
    loc = useLocation(),
    l = state.listings.find((l) => l.id === id),
    [light, setLight] = useState(null);
  useEffect(() => {
    const key = (e) => {
      if (light === null) return;
      if (e.key === "Escape") setLight(null);
      if (e.key === "ArrowRight")
        setLight((v) => (v + 1) % (l?.photos?.length || 1));
      if (e.key === "ArrowLeft")
        setLight(
          (v) => (v - 1 + (l?.photos?.length || 1)) % (l?.photos?.length || 1),
        );
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [light, l]);
  if (!l) return <NotFound />;
  return (
    <main className="photo-tour">
      <div className="row between">
        <Button variant="text" onClick={() => nav(`/rooms/${id}${loc.search}`)}>
          <Icon name="ChevronLeft" />
          Back to listing
        </Button>
        <h2>Photo tour</h2>
        <span>{l.photos?.length || 0} photos</span>
      </div>
      <div className="photo-strip">
        {(l.photos || []).map((p, i) => (
          <a key={i} href={"#photo-" + i}>
            <img src={p} alt="" />
            <small>{l.photoCaptions?.[i] || "Home"}</small>
          </a>
        ))}
      </div>
      <div className="tour-grid">
        {(l.photos || []).map((p, i) => (
          <button id={"photo-" + i} key={i} onClick={() => setLight(i)}>
            <h2>{l.photoCaptions?.[i] || "Home"}</h2>
            <img src={p} alt={l.photoCaptions?.[i] || l.title} />
          </button>
        ))}
      </div>
      {light !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          <button
            className="icon-btn light-close"
            aria-label="Close photo viewer"
            onClick={() => setLight(null)}
          >
            <Icon name="X" />
          </button>
          <button
            className="icon-btn"
            aria-label="Previous photo"
            onClick={() =>
              setLight((v) => (v - 1 + l.photos.length) % l.photos.length)
            }
          >
            <Icon name="ChevronLeft" />
          </button>
          <img
            src={l.photos[light]}
            alt={l.photoCaptions?.[light] || l.title}
          />
          <button
            className="icon-btn"
            aria-label="Next photo"
            onClick={() => setLight((v) => (v + 1) % l.photos.length)}
          >
            <Icon name="ChevronRight" />
          </button>
          <span>
            {light + 1} / {l.photos.length}
          </span>
        </div>
      )}
    </main>
  );
}
export default function Listing() {
  const { id } = useParams(),
    {
      state,
      isSaved,
      actions,
      listingRating,
      listingReviewCount,
      unavailableNights,
      update,
      notify,
    } = useApp(),
    { save } = useSave(),
    loc = useLocation(),
    nav = useSidNavigate(),
    l = state.listings.find((l) => l.id === id),
    q = readSearch(new URLSearchParams(loc.search)),
    [modal, setModal] = useState(null),
    [share, setShare] = useState(false),
    [report, setReport] = useState(""),
    [details, setDetails] = useState(""),
    [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 600);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  if (!l) return <NotFound />;
  const host = state.users.find((u) => u.id === l.hostId),
    price =
      q.checkIn && q.checkOut
        ? computePrice(l, q.checkIn, q.checkOut, q.guests)
        : null,
    error = availability(state, l, q.checkIn, q.checkOut),
    guestsError =
      q.guests.adults + q.guests.children > (l.maxGuests || 16)
        ? "Too many guests"
        : q.guests.pets && !l.allowsPets
          ? "This place does not allow pets"
          : "";
  const change = (next) => {
      nav(roomUrl(l, next), { replace: true });
      setModal(null);
    },
    reserve = () => {
      if (!q.checkIn || !q.checkOut) {
        setModal("dates");
        return;
      }
      if (error || guestsError) return;
      const next = {
        ...q,
        guests: { ...q.guests, adults: Math.max(1, q.guests.adults) },
      };
      nav(roomUrl(l, next).replace("/rooms/", "/book/stays/"));
    };
  const contact = () => {
    const old = state.conversations.find(
      (c) => c.listingId === id && c.hostId === l.hostId,
    );
    nav(old ? `/messages/${old.id}` : `/messages/new?listing=${id}`);
  };
  return (
    <main className="page narrow listing-page">
      {scrolled && (
        <div className="listing-subnav">
          <nav>
            {["Photos", "Amenities", "Reviews", "Location"].map((t) => (
              <a key={t} href={"#" + t.toLowerCase()}>
                {t}
              </a>
            ))}
          </nav>
          <span>{money(l.nightlyPrice, false)} night</span>
          <Button variant="brand" onClick={reserve}>
            Reserve
          </Button>
        </div>
      )}
      <div className="row between title-row">
        <h1>{l.title}</h1>
        <div className="row">
          <button className="text" onClick={() => setShare(true)}>
            <Icon name="Upload" size={18} />
            Share
          </button>
          <button className="text" onClick={() => save(id)}>
            <Icon
              name="Heart"
              size={18}
              fill={isSaved(id) ? "#ff385c" : "none"}
            />{" "}
            {isSaved(id) ? "Saved" : "Save"}
          </button>
        </div>
      </div>
      <div className="listing-photo-grid" id="photos">
        {(l.photos || []).slice(0, 5).map((p, i) => (
          <SidLink key={i} to={`/rooms/${id}/photos${loc.search}#photo-${i}`}>
            <img src={p} alt={l.photoCaptions?.[i] || l.title} />
          </SidLink>
        ))}
        <SidLink
          to={`/rooms/${id}/photos${loc.search}`}
          className="btn photo-all"
        >
          <Icon name="Grid2X2" size={16} />
          Show all photos
        </SidLink>
      </div>
      <div className="listing-columns">
        <div className="listing-main">
          <section>
            <h2>
              {l.roomType === "private_room"
                ? "Room"
                : "Entire " +
                  (l.propertyType || "home").replaceAll("_", " ")}{" "}
              in {l.city}, {l.region}
            </h2>
            <p className="muted">
              {l.maxGuests || 0} guests · {l.bedrooms || "Studio"}{" "}
              {l.bedrooms ? "bedrooms" : ""} · {l.beds || 1} beds ·{" "}
              {l.bathrooms || 1} baths
            </p>
            <a
              className={`guest-favorite-box ${l.guestFavorite ? "" : "simple"}`}
              href="#reviews"
            >
              {l.guestFavorite && (
                <>
                  <Icon name="Medal" size={36} />
                  <strong>
                    Guest
                    <br />
                    favorite
                  </strong>
                  <span>
                    One of the most loved homes on Airbnb, according to guests
                  </span>
                </>
              )}
              <strong>
                ★{" "}
                {listingReviewCount(id) ? listingRating(id).toFixed(2) : "New"}
              </strong>
              <u>{listingReviewCount(id)} reviews</u>
            </a>
          </section>
          <section>
            <SidLink to={`/users/show/${l.hostId}`} className="row">
              <Avatar user={host} />
              <div>
                <strong>Hosted by {host?.firstName || "your host"}</strong>
                <small>
                  {host?.isSuperhost ? "Superhost · " : ""}
                  {new Date().getFullYear() -
                    Number(
                      (
                        host?.joinedAt || String(new Date().getFullYear())
                      ).slice(0, 4),
                    )}{" "}
                  years hosting
                </small>
              </div>
            </SidLink>
          </section>
          <section>
            {(l.highlights || []).map((h, i) => (
              <div className="highlight row" key={i}>
                <Icon name={h.icon} size={28} />
                <div>
                  <strong>{h.title}</strong>
                  <small>{h.text}</small>
                </div>
              </div>
            ))}
          </section>
          <section>
            <p className="description clamp">{l.description}</p>
            <button className="text" onClick={() => setModal("description")}>
              Show more <Icon name="ChevronRight" size={16} />
            </button>
          </section>
          <section>
            <h2>Where you’ll sleep</h2>
            <div className="sleep-grid">
              {(l.bedArrangement || []).map((b, i) => (
                <div key={i}>
                  <img src={l.photos?.[i + 2] || l.photos?.[0]} alt={b.room} />
                  <strong>{b.room}</strong>
                  <small>{b.beds}</small>
                </div>
              ))}
            </div>
          </section>
          <section id="amenities">
            <h2>What this place offers</h2>
            <div className="amenity-grid">
              {(l.amenities || []).slice(0, 10).map((id) => {
                const a = state.amenities.find((a) => a.id === id);
                return (
                  <div className="row" key={id}>
                    <Icon name={a?.icon || "CircleCheck"} />
                    {a?.label || id.replaceAll("_", " ")}
                  </div>
                );
              })}
            </div>
            <Button onClick={() => setModal("amenities")}>
              Show all {l.amenities?.length || 0} amenities
            </Button>
          </section>
          <section>
            <h2>
              {price
                ? `${price.nights} nights in ${l.city}`
                : "Select check-in date"}
            </h2>
            <p className="muted">{dateRange(q.checkIn, q.checkOut)}</p>
            <Calendar
              checkIn={q.checkIn}
              checkOut={q.checkOut}
              onChange={(dates) =>
                nav(roomUrl(l, { ...q, ...dates }), { replace: true })
              }
              blocked={unavailableNights(id)}
              minNights={l.minNights}
            />
            {error && <p className="error-text">{error}</p>}
          </section>
        </div>
        <aside className="reserve-column">
          <div className="reserve-card">
            <p className="reserve-price">
              <strong>{money(l.nightlyPrice, false)}</strong> night
            </p>
            <div className="reservation-inputs">
              <button onClick={() => setModal("dates")}>
                <b>CHECK-IN</b>
                {fmtDate(q.checkIn)}
              </button>
              <button onClick={() => setModal("dates")}>
                <b>CHECKOUT</b>
                {fmtDate(q.checkOut)}
              </button>
              <button
                className="guest-input"
                onClick={() => setModal("guests")}
              >
                <b>GUESTS</b>
                {guestText({ ...q.guests, adults: q.guests.adults || 1 })}
                <Icon name="ChevronDown" size={16} />
              </button>
            </div>
            {(error || guestsError) && (
              <p className="error-text">{error || guestsError}</p>
            )}
            <Button
              className="full"
              variant="brand"
              onClick={reserve}
              disabled={!!(error || guestsError)}
            >
              {price ? "Reserve" : "Check availability"}
            </Button>
            <small className="reserve-note">
              You won’t be charged yet
              {!l.instantBook ? " — this is a request to book" : ""}
            </small>
            {price && <PriceBreakdown price={price} />}
          </div>
          <button
            className="text report-link"
            onClick={() => setModal("report")}
          >
            <Icon name="Flag" size={16} />
            Report this listing
          </button>
        </aside>
      </div>
      <ReviewsDisplay listing={l} />
      <section id="location">
        <h2>Where you’ll be</h2>
        <p>
          {l.city}, {l.region}, {l.country}
        </p>
        <div className="location-map">
          <OfflineMap listings={[l]} query={{ query: l.city }} />
        </div>
        <p>
          {l.neighborhood}. Discover local cafés, quiet walks and all the places
          your host loves.
        </p>
      </section>
      <section>
        <h2>Meet your host</h2>
        <div className="host-section">
          <SidLink to={`/users/show/${l.hostId}`} className="host-card">
            <Avatar user={host} size={96} />
            <h2>{host?.firstName || "Your host"}</h2>
            <strong>{host?.isSuperhost ? "Superhost" : "Host"}</strong>
            <p>
              {
                state.reviews.filter(
                  (r) =>
                    r.subjectUserId === l.hostId && r.status === "published",
                ).length
              }{" "}
              Reviews · {listingRating(id).toFixed(2)} Rating
            </p>
          </SidLink>
          <div>
            <h3>{host?.firstName || "Your host"} is here to help</h3>
            <p>{host?.about}</p>
            <p>
              Response rate: {host?.responseRate ?? 100}%<br />
              Responds {host?.responseTimeText || "within a day"}
            </p>
            <Button variant="dark" onClick={contact}>
              Message host
            </Button>
            <small className="block">
              To protect your payment, always communicate and pay through
              Airbnb.
            </small>
          </div>
        </div>
      </section>
      <section>
        <h2>Things to know</h2>
        <div className="know-grid">
          {[
            [
              "House rules",
              `${l.houseRules?.checkInFrom || "15:00"} check-in · ${l.houseRules?.checkOutBy || "11:00"} checkout. ${l.maxGuests} guests maximum.`,
            ],
            ["Safety & property", (l.safetyNotes || []).join(". ")],
            [
              "Cancellation policy",
              policyText(l.cancellationPolicy, q.checkIn),
            ],
          ].map(([title, text]) => (
            <div key={title}>
              <strong>{title}</strong>
              <p>{text}</p>
              <button className="text" onClick={() => setModal(title)}>
                Show more <Icon name="ChevronRight" size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
      <Carousel
        title="Similar homes"
        listings={state.listings.filter(
          (x) => x.destinationId === l.destinationId && x.id !== id,
        )}
        query={{ query: l.city, destinationId: l.destinationId }}
      />
      {["dates", "guests"].includes(modal) && (
        <TripEditor
          q={q}
          listing={l}
          kind={modal}
          onSave={change}
          onClose={() => setModal(null)}
        />
      )}
      {share && (
        <Share
          title={l.title}
          photo={l.photos?.[0]}
          onClose={() => setShare(false)}
        />
      )}
      {modal && !["dates", "guests", "report"].includes(modal) && (
        <Modal
          title={
            modal === "description"
              ? "About this space"
              : modal === "amenities"
                ? "What this place offers"
                : modal
          }
          onClose={() => setModal(null)}
        >
          {modal === "description" ? (
            <p className="description">{l.description}</p>
          ) : modal === "amenities" ? (
            <>
              {["essentials", "features", "location", "safety"].map((group) => (
                <section key={group}>
                  <h3>{group.replace(/^./, (x) => x.toUpperCase())}</h3>
                  {state.amenities
                    .filter(
                      (a) =>
                        a.group === group && (l.amenities || []).includes(a.id),
                    )
                    .map((a) => (
                      <p className="row" key={a.id}>
                        <Icon name={a.icon} />
                        {a.label}
                      </p>
                    ))}
                </section>
              ))}
              <h3>Not included</h3>
              {[
                "washer",
                "air_conditioning",
                "smoke_alarm",
                "carbon_monoxide_alarm",
                "tv",
              ]
                .filter((id) => !(l.amenities || []).includes(id))
                .map((id) => (
                  <p key={id}>
                    <s>
                      {state.amenities.find((a) => a.id === id)?.label || id}
                    </s>
                  </p>
                ))}
            </>
          ) : modal === "House rules" ? (
            <>
              <p>
                Check-in after {l.houseRules?.checkInFrom || "15:00"}. Checkout
                before {l.houseRules?.checkOutBy || "11:00"}.
              </p>
              <p>
                No smoking. No parties or events. Quiet hours:{" "}
                {l.houseRules?.quietHours || "22:00–07:00"}.
              </p>
              {(l.houseRules?.additional || []).map((t) => (
                <p key={t}>{t}</p>
              ))}
            </>
          ) : modal === "Safety & property" ? (
            (l.safetyNotes || []).map((t) => <p key={t}>{t}</p>)
          ) : (
            <p>{policyText(l.cancellationPolicy, q.checkIn)}</p>
          )}
        </Modal>
      )}
      {modal === "report" && (
        <Modal
          title="Why are you reporting this listing?"
          onClose={() => setModal(null)}
          footer={
            <Button
              variant="dark"
              disabled={!report}
              onClick={() => {
                update((s) =>
                  s.reports.push({
                    id: genId("rpt"),
                    listingId: id,
                    reporterId: "user_001",
                    reason: report,
                    details,
                    createdAt: new Date().toISOString(),
                  }),
                );
                notify("Your report has been submitted");
                setModal(null);
              }}
            >
              Submit
            </Button>
          }
        >
          {[
            "Inaccurate or incorrect",
            "Not a real place",
            "Scam",
            "Offensive",
            "Other",
          ].map((v) => (
            <label className="check-row" key={v}>
              <input
                type="radio"
                name="report"
                checked={report === v}
                onChange={() => setReport(v)}
              />
              {v}
            </label>
          ))}
          <Field
            as="textarea"
            label="Details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </Modal>
      )}
    </main>
  );
}
