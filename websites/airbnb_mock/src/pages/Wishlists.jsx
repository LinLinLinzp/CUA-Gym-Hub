import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { useSave, WishlistCover } from "../components/SaveWishlist";
import { SidLink, useSidNavigate, NotFound } from "../components/navigation";
import {
  Button,
  Modal,
  Field,
  Confirm,
  Calendar,
  Guests,
  Share,
  Icon,
  Empty,
} from "../components/ui";
import ListingCard from "../components/ListingCard";
import OfflineMap from "../components/OfflineMap";
import {
  dateRange,
  guestText,
  availability,
  daysFromNow,
  nightsBetween,
  fmtDate,
} from "../utils/pricing";
export function Wishlists() {
  const { state, actions } = useApp(),
    { create } = useSave(),
    [edit, setEdit] = useState(false),
    [remove, setRemove] = useState(null);
  return (
    <main className="page">
      <div className="row between">
        <h1>Wishlists</h1>
        <div className="row">
          <Button variant="text" onClick={() => setEdit(!edit)}>
            {edit ? "Done" : "Edit"}
          </Button>
          <Button variant="dark" onClick={create}>
            Create wishlist
          </Button>
        </div>
      </div>
      {!state.wishlists.length && (
        <>
          <h2>Create your first wishlist</h2>
          <p>
            As you search, tap the heart icon to save your favorite places and
            Experiences to a wishlist.
          </p>
        </>
      )}
      <div className="wishlists-grid">
        <SidLink className="wishlist-tile" to="/wishlists/recently-viewed">
          <WishlistCover items={state.recentlyViewed.slice(0, 1)} />
          <h3>Recently viewed</h3>
          <small>
            {!state.recentlyViewed.length
              ? "No homes viewed yet"
              : nightsBetween(
                    state.recentlyViewed[0].viewedAt?.slice(0, 10),
                    daysFromNow(0),
                  ) === 0
                ? "Today"
                : nightsBetween(
                      state.recentlyViewed[0].viewedAt?.slice(0, 10),
                      daysFromNow(0),
                    ) === 1
                  ? "Yesterday"
                  : `${nightsBetween(state.recentlyViewed[0].viewedAt?.slice(0, 10), daysFromNow(0))} days ago`}
          </small>
        </SidLink>
        {state.wishlists.map((w) => (
          <article className="wishlist-tile" key={w.id}>
            <SidLink to={`/wishlists/${w.id}`}>
              <WishlistCover items={w.items} />
              <h3>{w.name}</h3>
              <small>{w.items?.length || 0} saved</small>
            </SidLink>
            {edit && (
              <button
                className="delete-tile circle"
                aria-label={`Delete ${w.name}`}
                onClick={() => setRemove(w)}
              >
                <Icon name="X" size={16} />
              </button>
            )}
          </article>
        ))}
      </div>
      {remove && (
        <Confirm
          title="Delete this wishlist?"
          onClose={() => setRemove(null)}
          onConfirm={() => {
            actions.deleteWishlist(remove.id);
            setRemove(null);
          }}
        >
          <p>“{remove.name}” will be permanently deleted.</p>
        </Confirm>
      )}
    </main>
  );
}
export function RecentlyViewed() {
  const { state, update, notify } = useApp(),
    [edit, setEdit] = useState(false),
    [confirm, setConfirm] = useState(false),
    groups = Object.groupBy
      ? Object.groupBy(
          state.recentlyViewed,
          (v) => v.viewedAt?.slice(0, 10) || "Unknown",
        )
      : state.recentlyViewed.reduce((a, v) => {
          const k = v.viewedAt?.slice(0, 10) || "Unknown";
          (a[k] ??= []).push(v);
          return a;
        }, {});
  return (
    <main className="page">
      <SidLink className="text" to="/wishlists">
        ‹ Wishlists
      </SidLink>
      <div className="row between">
        <h1>Recently viewed</h1>
        <div className="row">
          <Button variant="text" onClick={() => setEdit(!edit)}>
            {edit ? "Done" : "Edit"}
          </Button>
          <Button variant="text" onClick={() => setConfirm(true)}>
            Clear all
          </Button>
        </div>
      </div>
      {Object.entries(groups).map(([date, items]) => (
        <section key={date}>
          <h2>
            {date === daysFromNow(0)
              ? "Today"
              : date === daysFromNow(-1)
                ? "Yesterday"
                : date === "Unknown"
                  ? "Earlier"
                  : fmtDate(date)}
          </h2>
          <div className="recent-grid">
            {items.map((v) => {
              const l = state.listings.find((l) => l.id === v.listingId);
              return (
                l && (
                  <div key={v.listingId}>
                    <ListingCard listing={l} />
                    {edit && (
                      <Button
                        variant="text"
                        onClick={() => {
                          update((s) => {
                            s.recentlyViewed = s.recentlyViewed.filter(
                              (x) => x.listingId !== v.listingId,
                            );
                          });
                          notify("Removed from recently viewed");
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                )
              );
            })}
          </div>
        </section>
      ))}
      {!state.recentlyViewed.length && (
        <Empty title="No recently viewed homes">
          <SidLink to="/" className="btn dark">
            Start exploring
          </SidLink>
        </Empty>
      )}
      {confirm && (
        <Confirm
          title="Clear recently viewed?"
          label="Clear all"
          onClose={() => setConfirm(false)}
          onConfirm={() => {
            update((s) => {
              s.recentlyViewed = [];
            });
            notify("Recently viewed cleared");
            setConfirm(false);
          }}
        >
          <p>Your recently viewed homes will be removed.</p>
        </Confirm>
      )}
    </main>
  );
}
function Note({ item, wishlist }) {
  const { actions } = useApp(),
    [editing, setEditing] = useState(false),
    [note, setNote] = useState(item.note || "");
  return (
    <div className="wishlist-note">
      {editing ? (
        <>
          <Field
            as="textarea"
            label="Note"
            maxLength={250}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <small>{note.length}/250</small>
          <div className="row">
            <Button
              variant="text"
              onClick={() => {
                setEditing(false);
                setNote(item.note || "");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="dark"
              onClick={() => {
                actions.wishlist(wishlist.id, {
                  items: wishlist.items.map((i) =>
                    i.listingId === item.listingId ? { ...i, note } : i,
                  ),
                });
                setEditing(false);
              }}
            >
              Save
            </Button>
          </div>
        </>
      ) : (
        <>
          {item.note && <p>{item.note}</p>}
          <button className="text small" onClick={() => setEditing(true)}>
            {item.note ? "Edit note" : "Add note"}
          </button>
        </>
      )}
    </div>
  );
}
export function WishlistDetail() {
  const { id } = useParams(),
    { state, actions, notify } = useApp(),
    nav = useSidNavigate(),
    w = state.wishlists.find((w) => w.id === id),
    [modal, setModal] = useState(null),
    [name, setName] = useState(""),
    [draft, setDraft] = useState({}),
    [email, setEmail] = useState("");
  if (!w) return <NotFound />;
  const rows = (w.items || [])
      .map((i) => state.listings.find((l) => l.id === i.listingId))
      .filter(Boolean),
    q = { checkIn: w.checkIn, checkOut: w.checkOut, guests: w.guests };
  const open = (type) => {
    setName(w.name);
    setDraft({
      checkIn: w.checkIn,
      checkOut: w.checkOut,
      guests: w.guests || { adults: 0, children: 0, infants: 0, pets: 0 },
    });
    setModal(type);
  };
  return (
    <main className="wishlist-detail">
      <div className="wishlist-list">
        <SidLink className="text" to="/wishlists">
          ‹ Wishlists
        </SidLink>
        <div className="row between">
          <h1>{w.name}</h1>
          <div className="row">
            <Button variant="text" onClick={() => open("share")}>
              <Icon name="Upload" size={18} />
              Share
            </Button>
            <button
              className="circle"
              aria-label="Wishlist settings"
              onClick={() => open("settings")}
            >
              <Icon name="Ellipsis" />
            </button>
          </div>
        </div>
        <div className="chips">
          <Button onClick={() => open("dates")}>
            {w.checkIn ? dateRange(w.checkIn, w.checkOut) : "Add dates"}
          </Button>
          <Button onClick={() => open("guests")}>
            {w.guests?.adults ? guestText(w.guests) : "Add guests"}
          </Button>
        </div>
        <div className="listing-grid">
          {rows.map((l) => (
            <div key={l.id}>
              <ListingCard
                listing={l}
                query={q}
                unavailable={!!availability(state, l, w.checkIn, w.checkOut)}
              />
              <Note
                key={l.id}
                wishlist={w}
                item={w.items.find((i) => i.listingId === l.id)}
              />
            </div>
          ))}
        </div>
        {!rows.length && (
          <Empty title="No saves yet">
            <p>
              As you search, tap the heart icon to save your favorite places and
              Experiences to a wishlist.
            </p>
            <SidLink className="btn dark" to="/">
              Start exploring
            </SidLink>
          </Empty>
        )}
      </div>
      <aside>
        <OfflineMap listings={rows} query={q} />
      </aside>
      {modal === "settings" && (
        <Modal title="Settings" onClose={() => setModal(null)}>
          <div className="stack">
            <Button onClick={() => setModal("rename")}>Rename</Button>
            <Button onClick={() => setModal("delete")}>
              Delete this wishlist
            </Button>
          </div>
        </Modal>
      )}
      {modal === "rename" && (
        <Modal
          title="Rename wishlist"
          onClose={() => setModal(null)}
          footer={
            <Button
              variant="dark"
              disabled={!name.trim()}
              onClick={() => {
                actions.wishlist(id, { name: name.trim() });
                setModal(null);
              }}
            >
              Save
            </Button>
          }
        >
          <Field
            label="Name"
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <small>{name.length}/50 characters</small>
        </Modal>
      )}
      {modal === "delete" && (
        <Confirm
          title="Delete this wishlist?"
          onClose={() => setModal(null)}
          onConfirm={() => {
            actions.deleteWishlist(id);
            nav("/wishlists");
          }}
        >
          <p>“{w.name}” will be permanently deleted.</p>
        </Confirm>
      )}
      {["dates", "guests"].includes(modal) && (
        <Modal
          title={modal === "dates" ? "Edit dates" : "Edit guests"}
          wide={modal === "dates"}
          onClose={() => setModal(null)}
          footer={
            <>
              <Button
                variant="text"
                onClick={() => {
                  actions.wishlist(
                    id,
                    modal === "dates"
                      ? { checkIn: null, checkOut: null }
                      : {
                          guests: {
                            adults: 0,
                            children: 0,
                            infants: 0,
                            pets: 0,
                          },
                        },
                  );
                  setModal(null);
                }}
              >
                Clear
              </Button>
              <Button
                variant="dark"
                disabled={
                  modal === "dates" && !!draft.checkIn !== !!draft.checkOut
                }
                onClick={() => {
                  actions.wishlist(id, draft);
                  setModal(null);
                }}
              >
                Save
              </Button>
            </>
          }
        >
          {modal === "dates" ? (
            <Calendar
              {...draft}
              onChange={(d) => setDraft({ ...draft, ...d })}
            />
          ) : (
            <Guests
              value={draft.guests}
              onChange={(guests) => setDraft({ ...draft, guests })}
            />
          )}
        </Modal>
      )}
      {modal === "share" && (
        <Share
          title={w.name}
          photo={rows[0]?.photos?.[0]}
          onClose={() => setModal(null)}
          extra={
            <>
              <h3>Invite collaborators</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!email.trim()) return;
                  actions.wishlist(id, {
                    collaboratorIds: [
                      ...new Set([
                        ...(w.collaboratorIds || []),
                        "pending:" + email.trim().toLowerCase(),
                      ]),
                    ],
                  });
                  setEmail("");
                  notify("Collaborator invited");
                }}
              >
                <Field
                  label="Email address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button variant="dark">Invite</Button>
              </form>
              {(w.collaboratorIds || []).map((c) => (
                <p key={c}>Invited · {c.replace("pending:", "")}</p>
              ))}
            </>
          }
        />
      )}
    </main>
  );
}
