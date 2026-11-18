import React, { useRef, useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { SidLink, useSidNavigate, NotFound } from "../components/navigation";
import {
  Avatar,
  Button,
  Chip,
  Confirm,
  Field,
  Icon,
  Modal,
  Switch,
  CardForm,
  validateCard,
  cardRecord,
  Stepper,
  Empty,
} from "../components/ui";
import { ReviewCard } from "../components/ReviewsDisplay";
import ListingCard from "../components/ListingCard";
import { Carousel } from "./Browse";
import { uploadFiles } from "./Messages";
import { money, fmtDate, daysFromNow, genId, round2 } from "../utils/pricing";
export function Notifications() {
  const { state, actions } = useApp(),
    nav = useSidNavigate(),
    [menu, setMenu] = useState(null);
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  return (
    <main className="page narrow">
      <div className="row between">
        <h1>Notifications</h1>
        <Button variant="text" onClick={() => actions.notification()}>
          Mark all as read
        </Button>
      </div>
      {state.notifications.map((n) => (
        <article
          className={`notification-row ${n.read ? "" : "unread"}`}
          key={n.id}
        >
          <button
            className="row"
            onClick={() => {
              actions.notification(n.id);
              nav(n.link || "/notifications");
            }}
          >
            <Icon
              name={
                n.type === "message"
                  ? "MessageSquare"
                  : n.type === "review_reminder"
                    ? "Star"
                    : "Bell"
              }
            />
            <div>
              <strong>{n.title}</strong>
              <p>{n.body}</p>
              <small>{fmtDate(n.createdAt)}</small>
            </div>
            {!n.read && <i className="message-dot" />}
          </button>
          <div className="notification-menu-wrap">
            <button
              className="icon-btn"
              aria-label={`Actions for ${n.title}`}
              onClick={() => setMenu(menu === n.id ? null : n.id)}
            >
              <Icon name="Ellipsis" size={18} />
            </button>
            {menu === n.id && (
              <div className="thread-actions">
                <button
                  onClick={() => {
                    actions.notification(n.id, true);
                    setMenu(null);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </article>
      ))}
      {!state.notifications.length && <Empty title="No notifications" />}
    </main>
  );
}
const languageOptions = [
  "English",
  "Spanish",
  "French",
  "Portuguese",
  "German",
  "Italian",
  "Japanese",
  "Mandarin",
];
export function Profile() {
  const { id } = useParams(),
    { state, actions, notify } = useApp(),
    own = id === "user_001",
    u = own ? state.currentUser : state.users.find((u) => u.id === id),
    [edit, setEdit] = useState(false),
    [draft, setDraft] = useState({}),
    [uploading, setUploading] = useState(false),
    file = useRef();
  useEffect(() => setEdit(false), [id]);
  if (!u) return <NotFound />;
  const reviews = state.reviews.filter(
      (r) =>
        r.status === "published" &&
        (own
          ? r.type === "host_to_guest" && r.subjectUserId === id
          : r.type === "guest_to_listing" && r.subjectUserId === id),
    ),
    listings = state.listings.filter((l) => l.hostId === id);
  return (
    <main className="page narrow profile-page">
      <aside>
        <div className="profile-card">
          <Avatar user={u} size={112} />
          <h1>{u.firstName}</h1>
          <strong>{u.isSuperhost ? "Superhost" : "Guest"}</strong>
          <hr />
          <div className="row between">
            <strong>
              {reviews.length}
              <small>Reviews</small>
            </strong>
            <strong>
              {reviews.length
                ? (
                    reviews.reduce((n, r) => n + (r.overall || 0), 0) /
                    reviews.length
                  ).toFixed(1)
                : "—"}{" "}
              ★<small>Rating</small>
            </strong>
            <strong>
              {new Date().getFullYear() -
                Number(u.joinedAt?.slice(0, 4) || new Date().getFullYear())}
              <small>Years on Airbnb</small>
            </strong>
          </div>
        </div>
        <h2>{u.firstName}’s confirmed information</h2>
        {["Identity", "Email address", "Phone number"].map((t) => (
          <p className="row" key={t}>
            <Icon name="Check" size={18} />
            {t}
          </p>
        ))}
      </aside>
      <div>
        <div className="row between">
          <h1>About {u.firstName}</h1>
          {own && (
            <Button
              onClick={() => {
                setDraft({
                  about: u.about || "",
                  work: u.work || "",
                  location: u.location || "",
                  languages: u.languages || [],
                });
                setEdit(true);
              }}
            >
              Edit profile
            </Button>
          )}
        </div>
        {edit && own ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              actions.profile(draft);
              setEdit(false);
            }}
          >
            <Field
              label="About"
              as="textarea"
              maxLength={450}
              value={draft.about}
              onChange={(e) => setDraft({ ...draft, about: e.target.value })}
            />
            <small>{draft.about.length}/450</small>
            <Field
              label="Work"
              value={draft.work}
              onChange={(e) => setDraft({ ...draft, work: e.target.value })}
            />
            <Field
              label="Where I live"
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
            <h3>Languages</h3>
            <div className="chips">
              {languageOptions.map((v) => (
                <Chip
                  type="button"
                  key={v}
                  active={draft.languages.includes(v)}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      languages: draft.languages.includes(v)
                        ? draft.languages.filter((x) => x !== v)
                        : [...draft.languages, v],
                    })
                  }
                >
                  {v}
                </Chip>
              ))}
            </div>
            <div className="chips profile-edit-actions">
              <Button
                variant="text"
                type="button"
                onClick={() => setEdit(false)}
              >
                Cancel
              </Button>
              <Button variant="dark">Save</Button>
              <Button
                type="button"
                disabled={uploading}
                onClick={() => file.current.click()}
              >
                {uploading ? "Uploading…" : "Add photo"}
              </Button>
              <input
                type="file"
                ref={file}
                accept="image/*"
                hidden
                onChange={async (e) => {
                  setUploading(true);
                  try {
                    const [p] = await uploadFiles(e.target.files);
                    if (p) actions.profile({ avatarUrl: p.url });
                  } catch (err) {
                    notify(err.message);
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </div>
          </form>
        ) : (
          <>
            <p className="row">
              <Icon name="BriefcaseBusiness" />
              My work: {u.work || "Traveler"}
            </p>
            <p className="row">
              <Icon name="Languages" />
              Speaks {(u.languages || ["English"]).join(" and ")}
            </p>
            <p className="row">
              <Icon name="MapPin" />
              Lives in {u.location || "a place I love"}
            </p>
            <p>{u.about}</p>
          </>
        )}
        <section>
          <div className="row between">
            <h2>{u.firstName}’s reviews</h2>
            {own && (
              <SidLink className="text" to="/reviews">
                Your reviews
              </SidLink>
            )}
          </div>
          <div className="review-grid">
            {reviews.slice(0, 6).map((r) => (
              <ReviewCard review={r} key={r.id} />
            ))}
          </div>
          {!reviews.length && <p>No reviews yet.</p>}
        </section>
        {listings.length > 0 && (
          <section>
            <h2>{u.firstName}’s listings</h2>
            <div className="listing-grid">
              {listings.map((l) => (
                <ListingCard listing={l} key={l.id} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
export function HostHomes() {
  const { state } = useApp(),
    [nights, setNights] = useState(7),
    [destination, setDestination] = useState(state.destinations[0]?.id || ""),
    listings = state.listings.filter((l) => l.destinationId === destination),
    average = listings.length
      ? listings.reduce((n, l) => n + (l.nightlyPrice || 0), 0) /
        listings.length
      : 0;
  return (
    <main className="page host-page">
      <div>
        <h1>
          <span>Airbnb it.</span>
          <br />
          You could earn
        </h1>
        <div className="earning">{money(nights * average, false)}</div>
        <p>
          <strong>{nights} nights</strong> at an estimated{" "}
          {money(average, false)} a night
        </p>
        <input
          type="range"
          aria-label="Number of nights"
          min="1"
          max="30"
          value={nights}
          onChange={(e) => setNights(Number(e.target.value))}
        />
        <Field
          label="Location"
          as="select"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        >
          {state.destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Field>
        <p>
          Estimated earnings per month based on local nightly prices. Your
          actual earnings depend on your home, availability and local demand.
        </p>
      </div>
      <img
        src={
          state.listings.find((l) => l.destinationId === destination)
            ?.photos?.[0] || "/favicon.svg"
        }
        alt="A welcoming home"
      />
    </main>
  );
}
const accountTiles = [
  [
    "personal-info",
    "Personal info",
    "Provide personal details and how we can reach you",
    "ContactRound",
  ],
  [
    "login-and-security",
    "Login & security",
    "Your account is securely signed in",
    "ShieldCheck",
  ],
  [
    "payments",
    "Payments & payouts",
    "Review payments, coupons, and gift cards",
    "CreditCard",
  ],
  [
    "taxes",
    "Taxes",
    "Manage taxpayer information and tax documents",
    "FileText",
  ],
  [
    "notifications",
    "Notifications",
    "Choose notification preferences and how you want to be contacted",
    "Bell",
  ],
  [
    "privacy",
    "Privacy & sharing",
    "Manage your personal data and sharing preferences",
    "Eye",
  ],
  [
    "preferences",
    "Global preferences",
    "Set your default language, currency, and time zone",
    "Globe",
  ],
  [
    "travel-for-work",
    "Travel for work",
    "Find information about business travel",
    "BriefcaseBusiness",
  ],
];
export function Account() {
  const { section } = useParams(),
    { state, actions, update, notify } = useApp(),
    [editing, setEditing] = useState(null),
    [draft, setDraft] = useState(""),
    [error, setError] = useState(""),
    [card, setCard] = useState({}),
    [errors, setErrors] = useState({}),
    [add, setAdd] = useState(false);
  const title = accountTiles.find((t) => t[0] === section)?.[1] || "Account";
  const infoFields = [
    ["legalName", "Legal name"],
    ["preferredName", "Preferred name"],
    ["phone", "Phone number"],
    ["email", "Email address"],
    ["street", "Street address"],
    ["city", "City"],
    ["state", "State / province"],
    ["zip", "ZIP code"],
    ["country", "Country / region"],
    ["emergencyName", "Emergency contact name"],
    ["emergencyPhone", "Emergency contact phone"],
  ];
  const read = (k) =>
    k === "legalName"
      ? `${state.currentUser.firstName || ""} ${state.currentUser.lastName || ""}`
      : k.startsWith("emergency")
        ? state.currentUser.emergencyContact?.[
            k === "emergencyName" ? "name" : "phone"
          ] || ""
        : ["street", "city", "state", "zip", "country"].includes(k)
          ? state.currentUser.address?.[k] || ""
          : state.currentUser[k] || "";
  function save(k) {
    if (k === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft)) {
      setError("Enter a valid email address");
      return;
    }
    if (
      k.toLowerCase().includes("phone") &&
      draft.replace(/\D/g, "").length < 7
    ) {
      setError("Enter a valid phone number");
      return;
    }
    if (!draft.trim()) {
      setError("Required");
      return;
    }
    let patch;
    if (k === "legalName") {
      const [firstName, ...rest] = draft.trim().split(" ");
      patch = { firstName, lastName: rest.join(" ") };
    } else if (k.startsWith("emergency")) {
      patch = {
        emergencyContact: {
          ...state.currentUser.emergencyContact,
          [k === "emergencyName" ? "name" : "phone"]: draft.trim(),
        },
      };
    } else if (["street", "city", "state", "zip", "country"].includes(k)) {
      patch = { address: { ...state.currentUser.address, [k]: draft.trim() } };
    } else patch = { [k]: draft.trim() };
    actions.profile(patch);
    setEditing(null);
  }
  return (
    <main className="page narrow">
      <SidLink className="text" to="/account-settings">
        Account
      </SidLink>
      <h1>{title}</h1>
      {!section ? (
        <>
          <p>
            <strong>
              {state.currentUser.firstName} {state.currentUser.lastName}
            </strong>{" "}
            · {state.currentUser.email} ·{" "}
            <SidLink className="text" to="/users/show/user_001">
              Go to profile
            </SidLink>
          </p>
          <div className="account-tiles">
            {accountTiles.map(([path, label, sub, icon]) => (
              <SidLink to={`/account-settings/${path}`} key={path}>
                <Icon name={icon} size={32} />
                <h3>{label}</h3>
                <p>{sub}</p>
              </SidLink>
            ))}
          </div>
        </>
      ) : section === "personal-info" ? (
        <div>
          {infoFields.map(([k, label]) => (
            <div className="account-info-row" key={k}>
              <div className="row between">
                <div>
                  <strong>{label}</strong>
                  <p className="muted">{read(k) || "Not provided"}</p>
                </div>
                <Button
                  variant="text"
                  onClick={() => {
                    setEditing(editing === k ? null : k);
                    setDraft(read(k));
                    setError("");
                  }}
                >
                  {editing === k ? "Cancel" : "Edit"}
                </Button>
              </div>
              {editing === k && (
                <>
                  <Field
                    label={label}
                    value={draft}
                    error={error}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <Button variant="dark" onClick={() => save(k)}>
                    Save
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : section === "payments" ? (
        <>
          <h2>Payment methods</h2>
          {state.paymentMethods.map((p) => (
            <div className="account-info-row" key={p.id}>
              <div className="row between">
                <div>
                  <strong>
                    {p.type === "paypal"
                      ? "PayPal"
                      : `${p.brand || "Card"} •••• ${p.last4 || ""}`}
                  </strong>
                  <p>
                    {p.type === "paypal"
                      ? p.email
                      : `Expires ${p.expMonth}/${p.expYear}`}
                    {p.isDefault ? " · Default" : ""}
                  </p>
                </div>
                <div className="row">
                  {!p.isDefault && (
                    <Button
                      variant="text"
                      onClick={() => {
                        update((s) =>
                          s.paymentMethods.forEach(
                            (x) => (x.isDefault = x.id === p.id),
                          ),
                        );
                        notify("Default payment method updated");
                      }}
                    >
                      Set default
                    </Button>
                  )}
                  <Button
                    variant="text"
                    onClick={() => {
                      if (
                        p.isDefault ||
                        state.reservations.some(
                          (r) =>
                            r.paymentMethodId === p.id &&
                            r.checkOut >= daysFromNow(0) &&
                            ["confirmed", "pending"].includes(r.status),
                        )
                      ) {
                        notify(
                          "Keep this card: it is the default or is used on an upcoming reservation.",
                        );
                        return;
                      }
                      update((s) => {
                        s.paymentMethods = s.paymentMethods.filter(
                          (x) => x.id !== p.id,
                        );
                      });
                      notify("Payment method removed");
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <Button onClick={() => setAdd(true)}>Add payment method</Button>
          {add && (
            <Modal
              title="Add payment method"
              onClose={() => setAdd(false)}
              footer={
                <Button
                  variant="dark"
                  onClick={() => {
                    const e = validateCard(card);
                    setErrors(e);
                    if (Object.keys(e).length) return;
                    update((s) =>
                      s.paymentMethods.push({
                        ...cardRecord(card),
                        id: genId("pm"),
                        isDefault: !s.paymentMethods.length,
                        createdAt: new Date().toISOString(),
                      }),
                    );
                    notify("Payment method added");
                    setAdd(false);
                    setCard({});
                  }}
                >
                  Add card
                </Button>
              }
            >
              <CardForm value={card} onChange={setCard} errors={errors} />
            </Modal>
          )}
        </>
      ) : section === "notifications" ? (
        <>
          <p>Choose how we contact you.</p>
          {Object.entries(state.preferences.notifications || {}).map(
            ([k, v]) => (
              <div className="account-info-row row between" key={k}>
                <strong>
                  {k
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (x) => x.toUpperCase())}
                </strong>
                <Switch
                  checked={v}
                  label={k}
                  onChange={(value) =>
                    actions.preference({
                      notifications: {
                        ...state.preferences.notifications,
                        [k]: value,
                      },
                    })
                  }
                />
              </div>
            ),
          )}
        </>
      ) : section === "preferences" ? (
        <>
          <Field
            label="Preferred language"
            as="select"
            value={state.preferences.language}
            onChange={(e) => actions.preference({ language: e.target.value })}
          >
            {[
              ["en-US", "English (US)"],
              ["fr", "French"],
              ["es", "Spanish"],
              ["pt", "Portuguese"],
              ["de", "German"],
              ["ja", "Japanese"],
            ].map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Field>
          <Field
            label="Preferred currency"
            as="select"
            value={state.preferences.currency}
            onChange={(e) => actions.preference({ currency: e.target.value })}
          >
            {["USD", "EUR", "GBP", "CAD", "MXN"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Field>
          <Field
            label="Time zone"
            as="select"
            value={state.preferences.timeZone}
            onChange={(e) => actions.preference({ timeZone: e.target.value })}
          >
            {[
              "America/Los_Angeles",
              "America/New_York",
              "Europe/London",
              "Europe/Paris",
              "Asia/Tokyo",
              "Asia/Shanghai",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Field>
        </>
      ) : (
        <>
          <h2>{title}</h2>
          <p>
            {section === "login-and-security"
              ? "Your Airbnb account is securely signed in as Emily Carter. Your contact information can be updated in Personal info."
              : section === "taxes"
                ? "Your receipts include applicable occupancy taxes. You can find an itemized receipt in each trip."
                : section === "privacy"
                  ? "Your address, contact details and private host notes are only shared where needed to support your trip. Your public profile shows your first name and information you choose to share."
                  : "Keep your trip details and receipts together when you travel for work."}
          </p>
          <SidLink
            className="text"
            to={
              section === "taxes" ? "/trips" : "/account-settings/personal-info"
            }
          >
            {section === "taxes" ? "View trip receipts" : "Personal info"}
          </SidLink>
        </>
      )}
    </main>
  );
}
const articles = [
  [
    "cancelling-your-reservation",
    "Cancelling your reservation",
    "Open Trips and choose your reservation. Select Cancel reservation, choose a reason, and review your refund before confirming. Your dates are released after you cancel.",
  ],
  [
    "how-refunds-work",
    "How refunds work",
    "Refunds depend on your host’s cancellation policy, your selected rate and when you cancel. Review the calculated refund in the cancellation flow. Refunds return to the original payment method within 5–7 business days.",
  ],
  [
    "changing-a-reservation",
    "Changing a reservation",
    "Open the trip, select Change reservation and choose new available dates or guests. Review the price difference and confirm the change.",
  ],
  [
    "writing-reviews",
    "Writing reviews",
    "You have 14 days after checkout to write a review. Visit Reviews to rate your stay, describe your experience and leave a private note for your host.",
  ],
  [
    "wishlists",
    "Wishlists",
    "Tap the heart on a home to save it to a wishlist. Open Wishlists to organize saves, add dates and notes, rename a list or invite a collaborator.",
  ],
  [
    "messaging-your-host",
    "Messaging your host",
    "Use Messages to contact your host. You can send text and photos, react to messages, and find your trip details in the conversation.",
  ],
  [
    "service-fees",
    "Service fees",
    "The Airbnb service fee helps us offer support and maintain the platform. It is shown in your price breakdown before you book.",
  ],
  [
    "payment-methods",
    "Payment methods",
    "Manage saved cards in Account, Payments. You can add a card at checkout or in your account. You can’t remove the default card or one used for an upcoming stay.",
  ],
  [
    "check-in",
    "Finding check-in details",
    "Open your confirmed trip to find check-in times, the address and a link to message your host. Exact arrival instructions are shared in your conversation.",
  ],
  [
    "aircover",
    "AirCover for guests",
    "If something unexpected affects your stay, contact your host and review your trip details. Airbnb Support can help you understand your options.",
  ],
  [
    "accessibility",
    "Accessibility and your stay",
    "Use Accessibility features in Filters to find homes with step-free entrances. Message the host before booking to confirm the home meets your needs.",
  ],
  [
    "account-and-privacy",
    "Your account and privacy",
    "Visit Account to update your personal information and notification preferences. Share only the information you want visible on your public profile.",
  ],
];
export function Help() {
  const { id } = useParams(),
    loc = useLocation(),
    [search, setSearch] = useState(""),
    article = articles.find((a) => a[0] === id),
    topic = new URLSearchParams(loc.search).get("topic");
  if (id && !article) return <NotFound />;
  return (
    <main className="page narrow help-page">
      <SidLink className="text" to="/help">
        Help Center
      </SidLink>
      {article ? (
        <>
          <small>Guide · Guest</small>
          <h1>{article[1]}</h1>
          <p>{article[2]}</p>
          <h2>Related topics</h2>
          {articles
            .filter((a) => a[0] !== id)
            .slice(0, 4)
            .map((a) => (
              <p key={a[0]}>
                <SidLink className="text" to={`/help/article/${a[0]}`}>
                  {a[1]}
                </SidLink>
              </p>
            ))}
        </>
      ) : (
        <>
          <h1>Hi Emily, how can we help?</h1>
          {topic && <p>Explore our guides for {topic.replaceAll("-", " ")}.</p>}
          <Field
            label="Search help articles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="help-articles">
            {articles
              .filter((a) =>
                (a[1] + " " + a[2])
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((a) => (
                <SidLink key={a[0]} to={`/help/article/${a[0]}`}>
                  <Icon name="FileText" />
                  <h2>{a[1]}</h2>
                  <p>{a[2]}</p>
                </SidLink>
              ))}
          </div>
          {!articles.some((a) =>
            (a[1] + " " + a[2]).toLowerCase().includes(search.toLowerCase()),
          ) && (
            <Empty title="No matching articles">
              <p>Try searching for a different topic.</p>
            </Empty>
          )}
        </>
      )}
    </main>
  );
}
export function Activities({ kind = "experiences", detail = false }) {
  const { id } = useParams(),
    { state, update, notify } = useApp(),
    nav = useSidNavigate(),
    data = state[kind] || [],
    item = data.find((x) => x.id === id),
    [slotId, setSlot] = useState(null),
    [guests, setGuests] = useState(1),
    [confirm, setConfirm] = useState(false),
    service = kind === "services";
  if (detail && !item) return <NotFound />;
  if (!detail)
    return (
      <main className="page activity-browse">
        <nav className="tabs">
          <SidLink className="text" to="/">
            Homes
          </SidLink>
          <SidLink className="text" to="/experiences">
            Experiences
          </SidLink>
          <SidLink className="text" to="/services">
            Services
          </SidLink>
        </nav>
        <h1>{service ? "Airbnb Services" : "Airbnb Experiences"}</h1>
        <p>
          {service
            ? "Make your stay even more special"
            : "Discover a different side of your destination"}
        </p>
        <div className="activity-grid">
          {data.map((x) => (
            <SidLink to={`/${kind}/${x.id}`} key={x.id}>
              <img src={x.photo || "/favicon.svg"} alt={x.title} />
              <h3>{x.title}</h3>
              <p>{x.city}</p>
              <strong>
                From {money(service ? x.priceFrom : x.pricePerGuest, false)} /{" "}
                {service ? "session" : "guest"}
              </strong>
              {!service && <small> · ★ {x.rating?.toFixed(2) || "New"}</small>}
            </SidLink>
          ))}
        </div>
        {!data.length && <Empty title={`No ${kind} available right now`} />}
      </main>
    );
  const slot = (item.slots || []).find((s) => s.id === slotId),
    perGuest = !service || item.unit === "per guest",
    total = round2(
      (service ? item.priceFrom : item.pricePerGuest) * (perGuest ? guests : 1),
    );
  return (
    <main className="page narrow activity-detail">
      <SidLink className="text" to={"/" + kind}>
        ‹ {service ? "Services" : "Experiences"}
      </SidLink>
      <h1>{item.title}</h1>
      <div className="checkout-columns">
        <div>
          <img
            className="trip-hero"
            src={item.photo || "/favicon.svg"}
            alt={item.title}
          />
          <p>{item.description}</p>
          <h2>{service ? "Your service" : "What’s included"}</h2>
          {(
            item.includes || [
              "Personalized service",
              "An experienced local professional",
            ]
          ).map((t) => (
            <p className="row" key={t}>
              <Icon name="Check" />
              {t}
            </p>
          ))}
          <p>
            {item.providerName
              ? "Hosted by " + item.providerName
              : "Hosted by " +
                (state.users.find((u) => u.id === item.hostId)?.firstName ||
                  "a local expert")}
          </p>
        </div>
        <aside className="reserve-card">
          <h2>Choose a date</h2>
          {(item.slots || [])
            .filter((s) => s.date >= daysFromNow(0))
            .map((s) => (
              <label className="radio-card" key={s.id}>
                <span>
                  {fmtDate(s.date)} · {s.time}
                  <small>{s.spotsLeft} spots left</small>
                </span>
                <input
                  type="radio"
                  name="slot"
                  disabled={s.spotsLeft < 1}
                  checked={slotId === s.id}
                  onChange={() => {
                    setSlot(s.id);
                    setGuests(1);
                  }}
                />
              </label>
            ))}
          <div className="row between">
            <strong>Guests</strong>
            <Stepper
              label="Guests"
              min={1}
              max={slot?.spotsLeft || 1}
              value={guests}
              onChange={setGuests}
            />
          </div>
          <p>{money(total)} total</p>
          <Button
            className="full"
            variant="brand"
            disabled={!slot || slot.spotsLeft < guests}
            onClick={() => setConfirm(true)}
          >
            Reserve
          </Button>
        </aside>
      </div>
      {confirm && (
        <Confirm
          title="Confirm your booking"
          label="Confirm"
          onClose={() => setConfirm(false)}
          onConfirm={() => {
            update((s) => {
              const target = s[kind].find((x) => x.id === id),
                selected = target?.slots?.find((x) => x.id === slotId);
              if (!selected || selected.spotsLeft < guests) return;
              selected.spotsLeft -= guests;
              s.experienceBookings.unshift({
                id: genId("eb"),
                kind: service ? "service" : "experience",
                [service ? "serviceId" : "experienceId"]: id,
                slotId,
                guestId: "user_001",
                guests,
                total,
                status: "confirmed",
                createdAt: new Date().toISOString(),
              });
            });
            notify("Your booking is confirmed");
            nav("/trips");
          }}
        >
          <p>{item.title}</p>
          <p>
            {fmtDate(slot.date)} · {slot.time} · {guests} guests
          </p>
          <h2>{money(total)} total</h2>
        </Confirm>
      )}
    </main>
  );
}
