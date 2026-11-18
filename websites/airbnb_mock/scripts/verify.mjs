import assert from "node:assert/strict";
import { checkReviewRegressions } from "./review-regressions.mjs";
import fs from "node:fs";
import { createServer } from "vite";
import React from "react";
import { renderToString } from "react-dom/server";
import TestRenderer, { act } from "react-test-renderer";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { createInitialData } from "../src/data/seed.js";
import {
  computePrice,
  computeRefund,
  availability,
  daysFromNow,
  ratingKeys,
  reviewDue,
} from "../src/utils/pricing.js";
import {
  matchListings,
  emptyFilters,
  listingRating,
  listingReviews,
} from "../src/utils/search.js";
const origin = "http://127.0.0.1:5300",
  sid = "verify_" + Math.random().toString(36).slice(2),
  nativeFetch = global.fetch,
  pending = [];
let posts = 0;
const storage = () => {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
};
global.localStorage = storage();
global.sessionStorage = storage();
global.document = {
  addEventListener() {},
  removeEventListener() {},
  getElementById() {
    return null;
  },
};
global.window = {
  location: {
    search: "?sid=" + sid,
    pathname: "/",
    href: origin + "/?sid=" + sid,
  },
  scrollTo() {},
  addEventListener() {},
  removeEventListener() {},
};
global.fetch = (path, options) => {
  if (String(path).startsWith("/post")) posts++;
  const p = nativeFetch(new URL(path, origin), options);
  pending.push(p);
  return p;
};
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { AppProvider, AppContext, useApp } = await server.ssrLoadModule(
    "/src/store/AppContext.jsx",
  );
  const ui = await server.ssrLoadModule('/src/components/ui/index.jsx');
  const nextYear = String((new Date().getFullYear()+2)%100).padStart(2,'0');
  assert.deepEqual(ui.validateCard({number:'4242 4242 4242 4242',exp:'12/'+nextYear,cvv:'123',zip:'94110'}),{});
  assert(ui.validateCard({number:'1234',exp:'12/2029',cvv:'x',zip:''}).number);
  assert(ui.validateCard({number:'4242424242424242',exp:'12/2029',cvv:'123',zip:'94110'}).exp);
  const searchModule = await import('../src/utils/search.js');
  assert.equal(searchModule.readSearch(new URLSearchParams(),'50% off').query,'50% off');
  let ctx;
  function Capture() {
    ctx = useApp();
    return React.createElement("div", null, "Loaded");
  }
  let tree;
  await act(async () => {
    tree = TestRenderer.create(
      React.createElement(AppProvider, null, React.createElement(Capture)),
    );
    await new Promise((r) => setTimeout(r, 100));
  });
  assert.equal(ctx.state.listings.length, 60);
  const s = ctx.state;
  assert.equal(s.users.length, 65);
  assert.equal(s.reservations.length, 17);
  assert.equal(s.messages.length, 75);
  for (const r of s.reservations.filter((r) => ["confirmed", "pending"].includes(r.status))) {
    const l = s.listings.find((l) => l.id === r.listingId);
    assert(!l.blockedRanges.some((b) => r.checkIn < b.end && r.checkOut > b.start), r.id);
  }
  assert.deepEqual([...new Set(s.listings.map((l) => l.cancellationPolicy))].sort(),
    ["firm", "flexible", "limited", "moderate", "strict"]);
  assert.equal(ctx.reviewsDue.length, 2);
  assert.equal(
    s.conversations.reduce((n, c) => n + c.unreadCount, 0),
    4,
  );
  assert.equal(s.notifications.filter((n) => !n.read).length, 3);
  for (const l of s.listings) {
    assert(l.photos.length >= 5);
    for (const p of l.photos) assert(fs.existsSync("public" + p), p);
  }
  assert.equal(
    matchListings(s, { query: "California", filters: emptyFilters }).length,
    15,
  );
  assert.equal(
    matchListings(s, { query: "United States", filters: emptyFilters }).length,
    40,
  );
  assert.equal(
    matchListings(s, { query: "Nowhere City", filters: emptyFilters }).length,
    0,
  );
  assert.equal(computeRefund(s.reservations[0]).tier, "full");
  assert.equal(computeRefund(s.reservations[2]).tier, "none");
  assert.equal(computeRefund(s.reservations[3]).tier, "partial");
  const q = {
    query: "Asheville",
    destinationId: "dst_asheville",
    checkIn: null,
    checkOut: null,
    guests: { adults: 2, children: 0, infants: 0, pets: 0 },
    filters: { ...emptyFilters },
  };
  await act(() => ctx.actions.search(q));
  await act(() => ctx.actions.search(q));
  assert.equal(
    ctx.state.searchHistory.filter((h) => h.query === "Asheville" && !h.checkIn)
      .length,
    1,
  );
  const l = ctx.state.listings[0],
    booking = { ...q, checkIn: daysFromNow(100), checkOut: daysFromNow(103) };
  assert.equal(
    availability(ctx.state, l, booking.checkIn, booking.checkOut),
    "",
  );
  let rid;
  await act(() => {
    rid = ctx.actions.book(l.id, booking, {
      rateType: "refundable",
      paymentPlan: "full",
      paymentMethodId: "pm_001",
      phone: "+1 415 555 0142",
      message: "Looking forward to our stay.",
    });
  });
  let r = ctx.state.reservations.find((r) => r.id === rid);
  assert.equal(r.status, "confirmed");
  assert.equal(
    r.amountPaid,
    computePrice(l, booking.checkIn, booking.checkOut, booking.guests).total,
  );
  assert(
    ctx.state.conversations.some(
      (c) => c.id === r.conversationId && c.reservationId === rid,
    ),
  );
  assert(
    ctx.state.messages.some(
      (m) =>
        m.conversationId === r.conversationId &&
        m.body.includes("Looking forward"),
    ),
  );
  assert(ctx.state.notifications.some((n) => n.link === "/trips/" + rid));
  assert(availability(ctx.state, l, booking.checkIn, booking.checkOut));
  await act(() =>
    ctx.actions.cancel(
      rid,
      "my_plans_changed",
      "My travel plans changed",
      "Thank you for understanding.",
    ),
  );
  r = ctx.state.reservations.find((r) => r.id === rid);
  assert.equal(r.status, "cancelled");
  assert.equal(r.cancellation.refundTier, "full");
  assert.equal(
    availability(ctx.state, l, booking.checkIn, booking.checkOut),
    "",
  );
  let pendingId;
  await act(() => {
    pendingId = ctx.actions.book("lst_011", booking, {
      rateType: "refundable",
      paymentPlan: "full",
      paymentMethodId: "pm_001",
      message: "A quiet weekend for four friends.",
    });
  });
  assert.equal(
    ctx.state.reservations.find((r) => r.id === pendingId).status,
    "pending",
  );
  await act(() =>
    ctx.actions.cancel(pendingId, "withdrawn", "Request withdrawn", "", true),
  );
  assert.equal(
    ctx.state.reservations.find((r) => r.id === pendingId).status,
    "withdrawn",
  );
  let wid;
  await act(() => {
    wid = ctx.actions.createWishlist("Verification travel", "lst_060");
  });
  assert(
    ctx.state.wishlists
      .find((w) => w.id === wid)
      .items.some((i) => i.listingId === "lst_060"),
  );
  await act(() => ctx.actions.wishlist(wid, { name: "Summer travel" }));
  assert.equal(
    ctx.state.wishlists.find((w) => w.id === wid).name,
    "Summer travel",
  );
  await act(() => ctx.actions.saveListing(wid, "lst_059", true));
  assert(
    ctx.state.wishlists
      .find((w) => w.id === wid)
      .items.some((i) => i.listingId === "lst_059"),
  );
  await act(() => ctx.actions.removeSaved("lst_060"));
  assert(!ctx.isSaved("lst_060"));
  await act(() => ctx.actions.readThread("conv_003"));
  assert.equal(
    ctx.state.conversations.find((c) => c.id === "conv_003").unreadCount,
    0,
  );
  await act(() => ctx.actions.send("conv_003", "Could we arrive at 3pm?"));
  const msg = ctx.state.messages.at(-1);
  assert.equal(msg.senderId, "user_001");
  await act(() => ctx.actions.react(msg.id, "👍"));
  assert.equal(
    ctx.state.messages.find((m) => m.id === msg.id).reactions.length,
    1,
  );
  await act(() =>
    ctx.actions.message(msg.id, {
      body: "Could we arrive at 2pm?",
      editedAt: new Date().toISOString(),
    }),
  );
  assert(ctx.state.messages.find((m) => m.id === msg.id).editedAt);
  const due = ctx.reviewsDue[0];
  let rev;
  await act(() => {
    rev = ctx.actions.review(due.id, {
      overall: 5,
      ratings: Object.fromEntries(ratingKeys.map((k) => [k, 5])),
      publicText: "A thoughtful host and a beautiful home.",
      privateNote: "Thank you!",
    });
  });
  assert(!ctx.reviewsDue.some((r) => r.id === due.id));
  assert(
    ctx.state.reviews.some((r) => r.id === rev && r.status === "published"),
  );
  await act(() =>
    ctx.actions.review(
      due.id,
      {
        overall: 4,
        ratings: Object.fromEntries(ratingKeys.map((k) => [k, 4])),
        publicText: "Comfortable and well located.",
        privateNote: "",
      },
      rev,
    ),
  );
  assert(ctx.state.reviews.find((r) => r.id === rev).updatedAt);
  await act(() => ctx.actions.removeReview(rev));
  assert(ctx.reviewsDue.some((r) => r.id === due.id));
  await Promise.allSettled(pending);
  const go = await (await nativeFetch(origin + "/go?sid=" + sid)).json();
  for (const key of [
    "searchHistory",
    "reservations",
    "conversations",
    "messages",
    "notifications",
    "reviews",
    "wishlists",
  ])
    assert(go.state_diff[key], key);
  const isolation = await (
    await nativeFetch(origin + "/state?sid=" + sid + "_other")
  ).json();
  assert.equal(isolation.has_custom_state, false);
  console.log(
    "PASS seed, pricing, refund tiers, search, book/cancel, request/withdraw, wishlist, messaging, reviews, /go and session isolation",
  );
  const { default: SaveProvider } = await server.ssrLoadModule(
    "/src/components/SaveWishlist.jsx",
  );
  const browse = await server.ssrLoadModule("/src/pages/Browse.jsx"),
    listing = await server.ssrLoadModule("/src/pages/Listing.jsx"),
    trips = await server.ssrLoadModule("/src/pages/Trips.jsx"),
    wishlist = await server.ssrLoadModule("/src/pages/Wishlists.jsx"),
    reviews = await server.ssrLoadModule("/src/pages/Reviews.jsx"),
    messages = await server.ssrLoadModule("/src/pages/Messages.jsx"),
    support = await server.ssrLoadModule("/src/pages/Supporting.jsx"),
    checkout = await server.ssrLoadModule("/src/pages/Checkout.jsx");
  await checkReviewRegressions({ AppContext, getContext: () => ctx, SaveProvider, browse, messages });
  const pages = [
    ["/", browse.Home],
    ["/s/Anywhere/homes", browse.Search],
    ["/rooms/lst_001", listing.default],
    ["/rooms/lst_001/photos", listing.PhotoTour],
    ["/trips", trips.Trips],
    ["/trips/res_001", trips.TripDetail],
    ["/trips/res_001/cancel", trips.CancelTrip],
    ["/wishlists", wishlist.Wishlists],
    ["/wishlists/recently-viewed", wishlist.RecentlyViewed],
    ["/wishlists/wl_001", wishlist.WishlistDetail],
    ["/messages", messages.default],
    ["/messages/conv_001", messages.default],
    ["/messages/new?listing=lst_060", messages.NewMessage],
    ["/reviews", reviews.Reviews],
    ["/reviews/write/res_007", reviews.ReviewEditor],
    ["/notifications", support.Notifications],
    ["/users/show/user_001", support.Profile],
    ["/account-settings", support.Account],
    ["/account-settings/payments", support.Account],
    ["/experiences", support.Activities],
    ["/experiences/exp_001", support.Activities, { detail: true }],
    ["/help", support.Help],
    ["/host/homes", support.HostHomes],
    [
      "/book/stays/lst_001?checkin=" +
        daysFromNow(100) +
        "&checkout=" +
        daysFromNow(103) +
        "&adults=2",
      checkout.default,
    ],
  ];
  const seed = createInitialData(),
    empty = structuredClone(seed),
    large = structuredClone(seed);
  for (const k in empty) if (Array.isArray(empty[k])) empty[k] = [];
  large.listings = Array.from({ length: 300 }, (_, i) => ({
    ...seed.listings[i % 60],
    id: "synthetic_" + i,
  }));
  const oldError = console.error;
  console.error = (...a) => {
    if (
      !String(a[0]).includes("useLayoutEffect") &&
      !String(a[0]).includes("multiple renderers")
    )
      oldError(...a);
  };
  let rendered = 0;
  const single = structuredClone(seed);
  single.listings = [
    { id: "lst_001", title: "A quiet home", nightlyPrice: 100 },
  ];
  single.users = [];
  single.reservations = [];
  single.conversations = [];
  single.messages = [];
  single.reviews = [];
  single.wishlists = [{ id: "wl_001", name: "A short break" }];
  single.experiences = [];
  single.services = [];
  for (const world of [seed, empty, large, single]) {
    const value = {
      ...ctx,
      state: world,
      reviewsDue: world.reservations.filter((r) => reviewDue(world, r)),
      listingRating: (id) => listingRating(world, id),
      listingReviewCount: (id) => listingReviews(world, id).length,
      categoryAverages: (id) =>
        Object.fromEntries(ratingKeys.map((k) => [k, 5])),
      isSaved: (id) =>
        world.wishlists.some((w) => w.items?.some((i) => i.listingId === id)),
      unavailableNights: (id) =>
        world.listings.find((l) => l.id === id)?.blockedRanges || [],
    };
    for (const [path, Component, props = {}] of pages) {
      const route = path
        .split("?")[0]
        .replace(/\/lst_001(?=\/|$)/, "/:id")
        .replace(/\/res_00[17](?=\/|$)/, "/:id")
        .replace("/wl_001", "/:id")
        .replace("/conv_001", "/:id")
        .replace("/exp_001", "/:id")
        .replace("/user_001", "/:id")
        .replace("/Anywhere/", "/:slug/");
      const html = renderToString(
        React.createElement(
          AppContext.Provider,
          { value },
          React.createElement(
            MemoryRouter,
            { initialEntries: [path] },
            React.createElement(
              SaveProvider,
              null,
              React.createElement(
                Routes,
                null,
                React.createElement(Route, {
                  path: route,
                  element: React.createElement(Component, props),
                }),
              ),
            ),
          ),
        ),
      );
      assert(html.length > 30, path);
      rendered++;
    }
  }
  console.log(
    `PASS ${rendered} route renders across default, empty-array, 300-listing and minimal single-record worlds`,
  );
  const beforeIdle = posts;
  console.log("Checking 70-second idle persistence…");
  await new Promise((resolve) =>
    setTimeout(resolve, process.env.SKIP_IDLE === "1" ? 10 : 71000),
  );
  assert.equal(posts, beforeIdle);
  console.log(
    process.env.SKIP_IDLE === "1"
      ? "PASS no automatic mutation during targeted check"
      : "PASS idle: zero additional state posts over 71 seconds",
  );
  await act(() => tree.unmount());
  console.error = oldError;
  console.log("Verification session:", sid);
} finally {
  await server.close();
}
