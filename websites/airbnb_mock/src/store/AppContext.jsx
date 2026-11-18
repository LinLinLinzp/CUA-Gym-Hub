import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { loadState, saveState } from "../utils/dataManager";
import { createInitialData } from "../data/seed";
import {
  genId,
  genConfirmationCode,
  computePrice,
  computeRefund,
  round2,
  reviewDue,
  ratingKeys,
  daysFromNow,
  setDisplayCurrency,
  dateRange,
  guestText,
} from "../utils/pricing";
import {
  listingRating as rating,
  listingReviews,
  matchListings,
  emptyGuests,
} from "../utils/search";
export const AppContext = createContext(null);
const Context = AppContext;
export const useApp = () => useContext(Context);
export function AppProvider({ children }) {
  const [state, setState] = useState(null),
    ref = useRef(null),
    loading = useRef(null),
    [toast, setToast] = useState(null),
    toastTimer = useRef(null);
  useEffect(() => {
    let live = true;
    if (!loading.current)
      loading.current = loadState("airbnb", createInitialData);
    loading.current.then((s) => {
      if (live) {
        setDisplayCurrency(s.preferences?.currency);
        ref.current = s;
        setState(s);
      }
    });
    return () => {
      live = false;
    };
  }, []);
  const notify = useCallback((text, action) => {
    clearTimeout(toastTimer.current);
    setToast({ text, action });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const update = useCallback((fn) => {
    const next = structuredClone(ref.current);
    const value = fn(next);
    setDisplayCurrency(next.preferences?.currency);
    ref.current = next;
    setState(next);
    saveState("airbnb", next);
    return value;
  }, []);
  const actions = useMemo(
    () => ({
      search(q) {
        const now = new Date().toISOString();
        update((s) => {
          const entry = {
            ...q,
            id: genId("srch"),
            actorId: "user_001",
            resultCount: matchListings(s, q).length,
            createdAt: now,
          };
          delete entry.page;
          delete entry.sort;
          const same = (x) =>
            x.query === q.query &&
            x.checkIn === q.checkIn &&
            x.checkOut === q.checkOut &&
            JSON.stringify(x.guests) === JSON.stringify(q.guests);
          const old = s.searchHistory.find(same);
          if (old) entry.id = old.id;
          s.searchHistory = [
            entry,
            ...s.searchHistory.filter((x) => !same(x)),
          ].slice(0, 10);
        });
        notify("Search updated");
      },
      viewed(id) {
        update((s) => {
          s.recentlyViewed = [
            { listingId: id, viewedAt: new Date().toISOString() },
            ...s.recentlyViewed.filter((x) => x.listingId !== id),
          ].slice(0, 50);
        });
      },
      createWishlist(name, listingId, move = false) {
        const id = genId("wl"),
          now = new Date().toISOString();
        update((s) => {
          if (move && listingId)
            s.wishlists.forEach((w) => {
              w.items = (w.items || []).filter(
                (i) => i.listingId !== listingId,
              );
              w.updatedAt = now;
            });
          s.wishlists.unshift({
            id,
            ownerId: "user_001",
            name: name.trim().slice(0, 50),
            checkIn: null,
            checkOut: null,
            guests: { ...emptyGuests },
            items: listingId ? [{ listingId, addedAt: now, note: "" }] : [],
            collaboratorIds: [],
            createdAt: now,
            updatedAt: now,
          });
        });
        notify(listingId ? `Saved to ${name}` : "Wishlist created");
        return id;
      },
      saveListing(wishlistId, listingId, move = false) {
        const name = ref.current.wishlists.find(
          (w) => w.id === wishlistId,
        )?.name;
        update((s) => {
          const w = s.wishlists.find((w) => w.id === wishlistId);
          if (!w || w.items.length >= 100) return;
          if (move)
            s.wishlists.forEach((x) => {
              if (x.items.some((i) => i.listingId === listingId)) {
                x.items = x.items.filter((i) => i.listingId !== listingId);
                x.updatedAt = new Date().toISOString();
              }
            });
          if (!w.items.some((i) => i.listingId === listingId))
            w.items.unshift({
              listingId,
              addedAt: new Date().toISOString(),
              note: "",
            });
          w.updatedAt = new Date().toISOString();
        });
        return name;
      },
      removeSaved(id) {
        const before = structuredClone(
          ref.current.wishlists.filter((w) =>
            w.items?.some((i) => i.listingId === id),
          ),
        );
        update((s) =>
          s.wishlists.forEach((w) => {
            if (w.items.some((i) => i.listingId === id)) {
              w.items = w.items.filter((i) => i.listingId !== id);
              w.updatedAt = new Date().toISOString();
            }
          }),
        );
        notify(`Removed from ${before.map((w) => w.name).join(", ")}`, {
          label: "Undo",
          onClick: () => {
            update((s) =>
              before.forEach((old) => {
                const w = s.wishlists.find((w) => w.id === old.id);
                if (w) {
                  const item = old.items.find((i) => i.listingId === id);
                  if (item && !w.items.some((i) => i.listingId === id))
                    w.items.unshift(item);
                  w.updatedAt = new Date().toISOString();
                }
              }),
            );
            notify("Save restored");
          },
        });
      },
      wishlist(id, patch) {
        update((s) => {
          const w = s.wishlists.find((w) => w.id === id);
          if (w)
            Object.assign(w, patch, { updatedAt: new Date().toISOString() });
        });
        notify("Wishlist updated");
      },
      deleteWishlist(id) {
        update((s) => {
          s.wishlists = s.wishlists.filter((w) => w.id !== id);
        });
        notify("Wishlist deleted");
      },
      thread(id, patch) {
        update((s) => {
          const c = s.conversations.find((c) => c.id === id);
          if (c) Object.assign(c, patch);
        });
        notify("Conversation updated");
      },
      readThread(id, unread = false) {
        update((s) => {
          const c = s.conversations.find((c) => c.id === id);
          if (!c) return;
          const received = s.messages.filter(
            (m) =>
              m.conversationId === id &&
              m.senderId !== "user_001" &&
              m.kind !== "system",
          );
          if (unread) {
            const m = received.at(-1);
            if (m) m.readAt = null;
          } else received.forEach((m) => (m.readAt = new Date().toISOString()));
          c.unreadCount = received.filter((m) => m.readAt === null).length;
        });
      },
      send(id, body, attachments = []) {
        if (!body.trim() && !attachments.length) return;
        update((s) => {
          const now = new Date().toISOString();
          s.messages.push({
            id: genId("msg"),
            conversationId: id,
            senderId: "user_001",
            kind: attachments.length && !body.trim() ? "image" : "text",
            body: body.trim(),
            attachments,
            reactions: [],
            createdAt: now,
            readAt: now,
            editedAt: null,
            deletedAt: null,
            translated: false,
          });
          const c = s.conversations.find((c) => c.id === id);
          if (c) c.lastMessageAt = now;
        });
        notify("Message sent");
      },
      message(id, patch) {
        update((s) => {
          const m = s.messages.find((m) => m.id === id);
          if (m) Object.assign(m, patch);
        });
        notify("Message updated");
      },
      react(id, emoji) {
        update((s) => {
          const m = s.messages.find((m) => m.id === id);
          if (!m) return;
          m.reactions ??= [];
          const exists = m.reactions.some(
            (r) => r.emoji === emoji && r.userId === "user_001",
          );
          m.reactions = m.reactions.filter(
            (r) => !(r.emoji === emoji && r.userId === "user_001"),
          );
          if (!exists) m.reactions.push({ emoji, userId: "user_001" });
        });
        notify("Reaction updated");
      },
      inquiry(listingId, body, inquiry) {
        const s = ref.current,
          l = s.listings.find((l) => l.id === listingId);
        if (!l) return null;
        const old = s.conversations.find(
          (c) => c.listingId === listingId && c.hostId === l.hostId,
        );
        if (old) {
          actions.send(old.id, body);
          return old.id;
        }
        const id = genId("conv"),
          now = new Date().toISOString();
        update((s) => {
          s.conversations.unshift({
            id,
            type: "inquiry",
            listingId,
            reservationId: null,
            participantIds: ["user_001", l.hostId],
            hostId: l.hostId,
            lastMessageAt: now,
            unreadCount: 0,
            starred: false,
            archived: false,
            createdAt: now,
            inquiry: inquiry || null,
          });
          s.messages.push({
            id: genId("msg"),
            conversationId: id,
            senderId: "user_001",
            kind: "text",
            body: body.trim(),
            attachments: [],
            reactions: [],
            createdAt: now,
            readAt: now,
            editedAt: null,
            deletedAt: null,
            translated: false,
          });
        });
        notify("Message sent");
        return id;
      },
      book(listingId, q, options) {
        const l = ref.current.listings.find((l) => l.id === listingId);
        if (!l) return null;
        const id = genId("res"),
          now = new Date().toISOString();
        update((s) => {
          const priceBreakdown = computePrice(
            l,
            q.checkIn,
            q.checkOut,
            q.guests,
            options.rateType,
          );
          let pm = options.paymentMethodId;
          if (options.card) {
            pm = genId("pm");
            s.paymentMethods.push({
              ...options.card,
              id: pm,
              isDefault: false,
              createdAt: now,
            });
          }
          if (options.phone !== undefined) s.currentUser.phone = options.phone;
          let c = s.conversations.find(
            (c) =>
              c.listingId === listingId &&
              c.hostId === l.hostId &&
              c.type === "inquiry",
          );
          if (c) {
            c.type = "reservation";
            c.reservationId = id;
            c.lastMessageAt = now;
          } else {
            c = {
              id: genId("conv"),
              type: "reservation",
              listingId,
              reservationId: id,
              participantIds: ["user_001", l.hostId],
              hostId: l.hostId,
              lastMessageAt: now,
              unreadCount: 0,
              starred: false,
              archived: false,
              createdAt: now,
            };
            s.conversations.unshift(c);
          }
          const status = l.instantBook ? "confirmed" : "pending";
          s.reservations.unshift({
            id,
            confirmationCode: genConfirmationCode(),
            listingId,
            hostId: l.hostId,
            guestId: "user_001",
            checkIn: q.checkIn,
            checkOut: q.checkOut,
            nights: priceBreakdown.nights,
            guests: q.guests,
            status,
            bookingType: l.instantBook ? "instant" : "request",
            rateType: options.rateType,
            cancellationPolicy: l.cancellationPolicy,
            priceBreakdown,
            paymentPlan: options.paymentPlan,
            amountPaid: l.instantBook
              ? round2(
                  priceBreakdown.total *
                    (options.paymentPlan === "split" ? 0.5 : 1),
                )
              : 0,
            paymentMethodId: pm,
            messageToHost: options.message || "",
            conversationId: c.id,
            createdAt: now,
            confirmedAt: l.instantBook ? now : null,
            cancellation: null,
            alterations: [],
          });
          s.messages.push(
            systemMessage(
              c.id,
              l.instantBook
                ? `Reservation confirmed · ${dateRange(q.checkIn, q.checkOut)} · ${guestText(q.guests)}`
                : `Request sent · ${s.users.find((u) => u.id === l.hostId)?.firstName || "Your host"} has 24 hours to respond`,
              now,
            ),
          );
          if (options.message?.trim())
            s.messages.push({
              id: genId("msg"),
              conversationId: c.id,
              senderId: "user_001",
              kind: "text",
              body: options.message.trim(),
              attachments: [],
              reactions: [],
              createdAt: now,
              readAt: now,
              editedAt: null,
              deletedAt: null,
            });
          s.notifications.unshift({
            id: genId("ntf"),
            actorId: "user_001",
            type: "booking",
            title: l.instantBook
              ? "Your reservation is confirmed"
              : "Your request was sent",
            body: l.title,
            link: `/trips/${id}`,
            read: false,
            createdAt: now,
          });
        });
        return id;
      },
      cancel(id, reason, reasonText, note = "", withdraw = false) {
        update((s) => {
          const r = s.reservations.find((r) => r.id === id);
          if (!r || !["confirmed", "pending"].includes(r.status)) return;
          const now = new Date().toISOString(),
            refund = withdraw
              ? { tier: "full", refundAmount: 0, nonRefundedAmount: 0 }
              : computeRefund(r);
          r.status = withdraw ? "withdrawn" : "cancelled";
          r.cancellation = {
            cancelledBy: "user_001",
            reason: withdraw ? "withdrawn" : reason,
            reasonText: withdraw ? "Request withdrawn" : reasonText,
            note,
            refundAmount: refund.refundAmount,
            nonRefundedAmount: refund.nonRefundedAmount,
            refundTier: refund.tier,
            cancelledAt: now,
          };
          s.messages.push(
            systemMessage(
              r.conversationId,
              withdraw
                ? "Request withdrawn"
                : `Reservation cancelled · Refund of $${refund.refundAmount.toFixed(2)}`,
              now,
            ),
          );
          if (note.trim())
            s.messages.push({
              id: genId("msg"),
              conversationId: r.conversationId,
              senderId: "user_001",
              kind: "text",
              body: note,
              attachments: [],
              reactions: [],
              createdAt: now,
              readAt: now,
            });
          const c = s.conversations.find((c) => c.id === r.conversationId);
          if (c) c.lastMessageAt = now;
          if (!withdraw)
            s.notifications.unshift({
              id: genId("ntf"),
              actorId: "user_001",
              type: "booking",
              title: "Reservation cancelled",
              body: `Your refund of $${refund.refundAmount.toFixed(2)} is on its way.`,
              link: `/trips/${id}`,
              read: false,
              createdAt: now,
            });
        });
        notify(withdraw ? "Request withdrawn" : "Reservation cancelled");
      },
      review(rid, form, editId) {
        const id = editId || genId("rev");
        update((s) => {
          const now = new Date().toISOString();
          if (editId) {
            const v = s.reviews.find(
              (v) => v.id === id && v.authorId === "user_001",
            );
            if (v) Object.assign(v, form, { updatedAt: now });
          } else {
            const r = s.reservations.find((r) => r.id === rid);
            if (!r || !reviewDue(s, r)) return;
            s.reviews.unshift({
              ...form,
              id,
              type: "guest_to_listing",
              listingId: r.listingId,
              reservationId: rid,
              authorId: "user_001",
              subjectUserId: r.hostId,
              stayedWith:
                r.guests?.children || r.guests?.infants
                  ? "Stayed with kids"
                  : r.guests?.pets
                    ? "Stayed with a pet"
                    : null,
              stayLengthText:
                r.nights >= 7 ? "Stayed about a week" : "Stayed a few nights",
              status: "published",
              hostResponse: null,
              createdAt: now,
              updatedAt: null,
            });
            s.notifications
              .filter((n) => n.link === `/reviews/write/${rid}`)
              .forEach((n) => (n.read = true));
          }
        });
        notify("Review saved");
        return id;
      },
      removeReview(id) {
        update((s) => {
          const v = s.reviews.find(
            (v) => v.id === id && v.authorId === "user_001",
          );
          if (v) {
            v.status = "removed";
            v.updatedAt = new Date().toISOString();
          }
        });
        notify("Review deleted");
      },
      notification(id, remove = false) {
        update((s) => {
          if (remove)
            s.notifications = s.notifications.filter((n) => n.id !== id);
          else if (id)
            s.notifications
              .filter((n) => n.id === id)
              .forEach((n) => (n.read = true));
          else s.notifications.forEach((n) => (n.read = true));
        });
        notify(
          remove ? "Notification deleted" : "Notifications marked as read",
        );
      },
      profile(patch) {
        update((s) => Object.assign(s.currentUser, patch));
        notify("Profile updated");
      },
      preference(patch) {
        update((s) => Object.assign(s.preferences, patch));
        notify("Preferences saved");
      },
    }),
    [update, notify],
  );
  const selectors = useMemo(
    () =>
      state
        ? {
            listingRating: (id) => rating(state, id),
            listingReviewCount: (id) => listingReviews(state, id).length,
            categoryAverages: (id) => {
              const r = listingReviews(state, id);
              return Object.fromEntries(
                ratingKeys.map((k) => [
                  k,
                  r.length
                    ? r.reduce((v, x) => v + (x.ratings?.[k] || 0), 0) /
                      r.length
                    : 0,
                ]),
              );
            },
            isSaved: (id) =>
              state.wishlists.some((w) =>
                w.items?.some((i) => i.listingId === id),
              ),
            wishlistOf: (id) =>
              state.wishlists.filter((w) =>
                w.items?.some((i) => i.listingId === id),
              ),
            unavailableNights: (id) => [
              ...(state.listings.find((l) => l.id === id)?.blockedRanges || []),
              ...state.reservations
                .filter(
                  (r) =>
                    r.listingId === id &&
                    ["confirmed", "pending"].includes(r.status),
                )
                .map((r) => ({ start: r.checkIn, end: r.checkOut })),
            ],
            unreadMessageCount: state.conversations.reduce(
              (n, c) => n + (c.unreadCount || 0),
              0,
            ),
            unreadNotificationCount: state.notifications.filter((n) => !n.read)
              .length,
            reviewsDue: state.reservations.filter((r) => reviewDue(state, r)),
          }
        : {},
    [state],
  );
  if (!state)
    return (
      <div className="loading" role="status" aria-label="Loading Airbnb">
        <i />
        <i />
        <i />
      </div>
    );
  return (
    <Context.Provider value={{ state, update, actions, notify, ...selectors }}>
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast.text}
          {toast.action && (
            <button onClick={toast.action.onClick}>{toast.action.label}</button>
          )}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function systemMessage(
  conversationId,
  body,
  now = new Date().toISOString(),
) {
  return {
    id: genId("msg"),
    conversationId,
    senderId: "system",
    kind: "system",
    body,
    attachments: [],
    reactions: [],
    createdAt: now,
    readAt: now,
    editedAt: null,
    deletedAt: null,
  };
}
