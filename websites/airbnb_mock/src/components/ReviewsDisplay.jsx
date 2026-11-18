import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { listingReviews } from "../utils/search";
import { fmtDate, ratingKeys } from "../utils/pricing";
import { Avatar, Button, Icon, Modal } from "./ui";
import { SidLink } from "./navigation";
const categoryNames = {
  cleanliness: "Cleanliness",
  accuracy: "Accuracy",
  checkIn: "Check-in",
  communication: "Communication",
  location: "Location",
  value: "Value",
};
export function ReviewCard({ review: r, term = "" }) {
  const { state } = useApp(),
    author =
      r.authorId === "user_001"
        ? state.currentUser
        : state.users.find((u) => u.id === r.authorId),
    [more, setMore] = useState(false);
  const highlight = (text) =>
    !term
      ? text
      : text
          .split(
            new RegExp(
              `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
              "ig",
            ),
          )
          .map((part, i) =>
            part.toLowerCase() === term.toLowerCase() ? (
              <mark key={i}>{part}</mark>
            ) : (
              part
            ),
          );
  return (
    <article className="review-card">
      <SidLink className="row" to={`/users/show/${r.authorId}`}>
        <Avatar user={author} />
        <div>
          <strong>{author?.firstName || "Guest"}</strong>
          <small>{author?.location || "Airbnb guest"}</small>
        </div>
      </SidLink>
      <div className="review-meta">
        {"★".repeat(Math.round(r.overall || 0))} · {fmtDate(r.createdAt)} ·{" "}
        {r.stayLengthText || "Stayed a few nights"}
      </div>
      <p className={more ? "" : "clamp"}>{highlight(r.publicText || "")}</p>
      {(r.publicText || "").length > 100 && (
        <button className="text" onClick={() => setMore(!more)}>
          {more ? "Show less" : "Show more"}
        </button>
      )}
      {r.hostResponse && (
        <blockquote>
          <strong>Response from your host</strong>
          <p>{r.hostResponse.text}</p>
        </blockquote>
      )}
    </article>
  );
}
export default function ReviewsDisplay({ listing }) {
  const { state, listingRating, categoryAverages } = useApp(),
    [open, setOpen] = useState(false),
    [sort, setSort] = useState("recent"),
    [term, setTerm] = useState(""),
    all = listingReviews(state, listing.id),
    averages = categoryAverages(listing.id),
    filtered = all
      .filter((r) =>
        (r.publicText || "").toLowerCase().includes(term.toLowerCase()),
      )
      .sort((a, b) =>
        sort === "high"
          ? b.overall - a.overall
          : sort === "low"
            ? a.overall - b.overall
            : new Date(b.createdAt) - new Date(a.createdAt),
      );
  const summary = (
    <div className="review-summary">
      <div>
        <strong>Overall rating</strong>
        {[5, 4, 3, 2, 1].map((n) => (
          <div className="distribution" key={n}>
            <span>{n}</span>
            <i>
              <b
                style={{
                  width:
                    (all.filter((r) => r.overall === n).length /
                      Math.max(1, all.length)) *
                      100 +
                    "%",
                }}
              />
            </i>
          </div>
        ))}
      </div>
      {ratingKeys.map((k, i) => (
        <div key={k}>
          <strong>{categoryNames[k]}</strong>
          <h3>{averages[k].toFixed(1)}</h3>
          <Icon
            name={
              ["SprayCan", "CircleCheck", "Key", "MessageSquare", "Map", "Tag"][
                i
              ]
            }
          />
        </div>
      ))}
    </div>
  );
  return (
    <section id="reviews" className="listing-reviews">
      <h2>
        {all.length
          ? `★ ${listingRating(listing.id).toFixed(2)} · ${all.length} reviews`
          : "No reviews (yet)"}
      </h2>
      {all.length ? (
        <>
          {summary}
          <div className="review-grid">
            {[...all]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 6)
              .map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
          </div>
          <Button onClick={() => setOpen(true)}>
            Show all {all.length} reviews
          </Button>
        </>
      ) : (
        <p>
          This host has{" "}
          {
            state.reviews.filter(
              (r) =>
                r.subjectUserId === listing.hostId && r.status === "published",
            ).length
          }{" "}
          reviews for other places to stay.
        </p>
      )}
      {open && (
        <Modal
          title={`${all.length} reviews`}
          wide
          onClose={() => setOpen(false)}
          className="reviews-modal"
        >
          {summary}
          <div className="row between">
            <input
              className="review-search"
              placeholder="Search reviews"
              aria-label="Search reviews"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <select
              aria-label="Sort reviews"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Most recent</option>
              <option value="high">Highest rated</option>
              <option value="low">Lowest rated</option>
            </select>
          </div>
          {filtered.map((r) => (
            <ReviewCard key={r.id} review={r} term={term} />
          ))}
          {!filtered.length && <p>No reviews match your search.</p>}
        </Modal>
      )}
    </section>
  );
}
