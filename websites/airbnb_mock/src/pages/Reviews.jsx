import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { SidLink, NotFound } from "../components/navigation";
import { Button, Stars, Field, Confirm, Empty } from "../components/ui";
import { ReviewCard } from "../components/ReviewsDisplay";
import {
  daysFromNow,
  nightsBetween,
  ratingKeys,
  reviewDue,
} from "../utils/pricing";
export function Reviews() {
  const { state, reviewsDue, actions } = useApp(),
    [tab, setTab] = useState("Reviews to write"),
    [remove, setRemove] = useState(null),
    own = state.reviews.filter(
      (r) =>
        r.authorId === "user_001" &&
        r.type === "guest_to_listing" &&
        r.status === "published",
    ),
    about = state.reviews.filter(
      (r) =>
        r.subjectUserId === "user_001" &&
        r.type === "host_to_guest" &&
        r.status === "published",
    );
  return (
    <main className="page narrow">
      <h1>Reviews</h1>
      <div className="tabs">
        {[
          "Reviews to write",
          "Past reviews you’ve written",
          "Reviews about you",
        ].map((t) => (
          <button
            key={t}
            className={t === tab ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Reviews to write" ? (
        reviewsDue.length ? (
          reviewsDue.map((r) => {
            const l = state.listings.find((l) => l.id === r.listingId);
            return (
              <div className="review-due-card row between" key={r.id}>
                {l?.photos?.[0] && (
                  <img className="thumb" src={l.photos[0]} alt="" />
                )}
                <div className="spacer">
                  <h2>{l?.title || "Your stay"}</h2>
                  <p>
                    You have {14 - nightsBetween(r.checkOut, daysFromNow(0))}{" "}
                    days left
                  </p>
                </div>
                <SidLink className="btn dark" to={`/reviews/write/${r.id}`}>
                  Write a review
                </SidLink>
              </div>
            );
          })
        ) : (
          <Empty title="Nothing to review right now">
            <p>Reviews you’ve written will appear here.</p>
          </Empty>
        )
      ) : (
        <div className="your-reviews">
          {(tab === "Reviews about you" ? about : own).map((r) => (
            <div key={r.id}>
              <SidLink to={`/rooms/${r.listingId}`}>
                <h3>
                  {state.listings.find((l) => l.id === r.listingId)?.title ||
                    "Your stay"}
                </h3>
              </SidLink>
              <ReviewCard review={r} />
              {tab !== "Reviews about you" && (
                <div className="chips">
                  <SidLink className="text" to={`/reviews/edit/${r.id}`}>
                    Edit
                  </SidLink>
                  <button className="text" onClick={() => setRemove(r.id)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {!(tab === "Reviews about you" ? about : own).length && (
            <Empty title="No reviews yet">
              <p>Reviews will appear here.</p>
            </Empty>
          )}
        </div>
      )}
      {remove && (
        <Confirm
          title="Delete this review?"
          onClose={() => setRemove(null)}
          onConfirm={() => {
            actions.removeReview(remove);
            setRemove(null);
          }}
        >
          <p>This can’t be undone.</p>
        </Confirm>
      )}
    </main>
  );
}
export function ReviewEditor({ edit = false }) {
  const { id } = useParams(),
    { state, actions } = useApp(),
    existing = edit
      ? state.reviews.find(
          (r) =>
            r.id === id &&
            r.authorId === "user_001" &&
            r.status === "published",
        )
      : null,
    r = state.reservations.find(
      (r) => r.id === (edit ? existing?.reservationId : id),
    ),
    l = state.listings.find((l) => l.id === r?.listingId),
    [step, setStep] = useState(1),
    [done, setDone] = useState(false),
    [form, setForm] = useState(() =>
      existing
        ? {
            overall: existing.overall,
            ratings: existing.ratings || {},
            publicText: existing.publicText || "",
            privateNote: existing.privateNote || "",
          }
        : { overall: 0, ratings: {}, publicText: "", privateNote: "" },
    ),
    patch = (p) => setForm((f) => ({ ...f, ...p }));
  if (!r || (edit && !existing))
    return (
      <main className="page review-editor">
        <h1>This review is no longer available</h1>
        <SidLink className="btn dark" to="/reviews">
          Your reviews
        </SidLink>
      </main>
    );
  if (done)
    return (
      <main className="page review-editor">
        <h1>Thanks for your review!</h1>
        <p>Your experience helps future guests find a great place to stay.</p>
        <div className="chips">
          <SidLink className="btn dark" to="/trips">
            Back to trips
          </SidLink>
          <SidLink className="btn outline" to={`/rooms/${r.listingId}#reviews`}>
            View listing
          </SidLink>
        </div>
      </main>
    );
  if (!edit && !reviewDue(state, r))
    return (
      <main className="page review-editor">
        <h1>This review is no longer available</h1>
        <SidLink to="/reviews" className="btn dark">
          Your reviews
        </SidLink>
      </main>
    );
  const title =
      step === 1
        ? `How was your stay at ${l?.title || "your home"}?`
        : step === 2
          ? "Rate your stay in these areas"
          : step === 3
            ? "Write a public review"
            : step === 4
              ? "Write a private note to your host"
              : "Review and submit",
    valid =
      step === 1
        ? form.overall > 0
        : step === 2
          ? ratingKeys.every((k) => form.ratings[k] > 0)
          : step === 3
            ? form.publicText.trim().length > 0
            : true;
  return (
    <main className="page review-editor">
      <div className="progress">
        <i style={{ width: (step / 5) * 100 + "%" }} />
      </div>
      <small>Step {step} of 5</small>
      <h1>{title}</h1>
      {step === 1 ? (
        <>
          <p>Tell us about your experience.</p>
          <Stars
            value={form.overall}
            onChange={(overall) => patch({ overall })}
          />
          <p>
            {["", "Terrible", "Poor", "Okay", "Good", "Great"][form.overall]}
          </p>
        </>
      ) : step === 2 ? (
        <>
          {ratingKeys.map((k) => (
            <div className="rating-row row between" key={k}>
              <strong>
                {k === "checkIn"
                  ? "Check-in"
                  : k.replace(/^./, (x) => x.toUpperCase())}
              </strong>
              <Stars
                size={28}
                label={k}
                value={form.ratings[k]}
                onChange={(n) =>
                  patch({ ratings: { ...form.ratings, [k]: n } })
                }
              />
            </div>
          ))}
        </>
      ) : step === 3 ? (
        <>
          <p>Tell future guests about your stay.</p>
          <Field
            label="Public review"
            as="textarea"
            maxLength={1000}
            value={form.publicText}
            onChange={(e) => patch({ publicText: e.target.value })}
          />
          <small>{form.publicText.length}/1000</small>
        </>
      ) : step === 4 ? (
        <>
          <p>This note is only shared with your host.</p>
          <Field
            label="Private note (optional)"
            as="textarea"
            maxLength={2000}
            value={form.privateNote}
            onChange={(e) => patch({ privateNote: e.target.value })}
          />
          <Button variant="text" onClick={() => setStep(5)}>
            Skip
          </Button>
        </>
      ) : (
        <>
          <div className="row between">
            <h2>Overall: {"★".repeat(form.overall)}</h2>
            <Button variant="text" onClick={() => setStep(1)}>
              Edit overall rating
            </Button>
          </div>
          <div className="row between">
            <p>
              {ratingKeys.map((k) => `${k}: ${form.ratings[k]}`).join(" · ")}
            </p>
            <Button variant="text" onClick={() => setStep(2)}>
              Edit category ratings
            </Button>
          </div>
          <div className="row between">
            <p>{form.publicText}</p>
            <Button variant="text" onClick={() => setStep(3)}>
              Edit public review
            </Button>
          </div>
          <div className="row between">
            <p>{form.privateNote || "No private note"}</p>
            <Button variant="text" onClick={() => setStep(4)}>
              Edit private note
            </Button>
          </div>
        </>
      )}
      <div className="editor-footer row between">
        {step > 1 ? (
          <Button variant="text" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        ) : (
          <SidLink className="text" to="/reviews">
            Back
          </SidLink>
        )}
        {step < 5 ? (
          <Button
            variant="dark"
            disabled={!valid}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="brand"
            onClick={() => {
              actions.review(
                r.id,
                { ...form, publicText: form.publicText.trim() },
                edit ? id : null,
              );
              setDone(true);
            }}
          >
            {edit ? "Save review" : "Submit review"}
          </Button>
        )}
      </div>
    </main>
  );
}
