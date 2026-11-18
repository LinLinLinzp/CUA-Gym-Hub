import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { SidLink, useSidNavigate, NotFound } from "../components/navigation";
import {
  Button,
  Chip,
  Avatar,
  Icon,
  Field,
  Modal,
  Confirm,
  Empty,
  Calendar,
  Guests,
} from "../components/ui";
import { roomUrl } from "../components/ListingCard";
import { Withdraw } from "./Trips";
import { withSid } from "../utils/dataManager";
import {
  dateRange,
  guestText,
  money,
  fmtDate,
  tripStatus,
} from "../utils/pricing";
export async function uploadFiles(files) {
  const body = new FormData();
  for (const file of files) body.append("files", file);
  const res = await fetch(withSid("/upload"), { method: "POST", body });
  if (!res.ok)
    throw Error("Your upload could not be completed. Please try again.");
  const data = await res.json();
  return (data.files || []).map((f) => ({
    url: f.url,
    name: f.original_name,
    size: f.size,
    contentType: f.content_type,
  }));
}
export default function Messages() {
  const { id } = useParams(),
    { state, actions, notify } = useApp(),
    nav = useSidNavigate(),
    [filter, setFilter] = useState("All"),
    [search, setSearch] = useState(""),
    [searching, setSearching] = useState(false),
    [threadMenu, setThreadMenu] = useState(null),
    [moreFilter, setMoreFilter] = useState(false),
    [details, setDetails] = useState(() => !(window.innerWidth <= 1270)),
    [settings, setSettings] = useState(false),
    [body, setBody] = useState(""),
    [attachments, setAttachments] = useState([]),
    [uploading, setUploading] = useState(false),
    [messageMenu, setMessageMenu] = useState(null),
    [editing, setEditing] = useState(null),
    [editBody, setEditBody] = useState(""),
    [unsend, setUnsend] = useState(null),
    [photo, setPhoto] = useState(null),
    [withdraw, setWithdraw] = useState(false),
    end = useRef(),
    file = useRef(),
    composer = useRef(),
    settingsRef = useRef();
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") {
        setThreadMenu(null);
        setMoreFilter(false);
        setMessageMenu(null);
        setSettings(false);
      }
    };
    const outside = (e) => {
      if (!settingsRef.current?.contains(e.target)) setSettings(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("mousedown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("mousedown", outside);
    };
  }, []);
  const conversation = state.conversations.find((c) => c.id === id),
    host = state.users.find((u) => u.id === conversation?.hostId),
    l = state.listings.find((l) => l.id === conversation?.listingId),
    r = state.reservations.find((r) => r.id === conversation?.reservationId),
    messages = state.messages
      .filter((m) => m.conversationId === id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  useEffect(() => {
    setBody("");
    setAttachments([]);
    setMessageMenu(null);
    setEditing(null);
    end.current?.scrollIntoView({ block: "end" });
  }, [id]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length]);
  const rows = state.conversations
    .filter((c) => {
      const h = state.users.find((u) => u.id === c.hostId),
        listing = state.listings.find((l) => l.id === c.listingId),
        text = [
          h?.firstName,
          h?.lastName,
          listing?.title,
          ...state.messages
            .filter((m) => m.conversationId === c.id)
            .map((m) => m.body),
        ]
          .join(" ")
          .toLowerCase();
      return (
        (filter === "Archived" ? c.archived : !c.archived) &&
        (filter === "Traveling"
          ? ["reservation", "inquiry"].includes(c.type)
          : filter === "Support"
            ? c.type === "support"
            : filter === "Unread"
              ? c.unreadCount > 0
              : filter === "Starred"
                ? c.starred
                : true) &&
        text.includes(search.toLowerCase())
      );
    })
    .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  const send = () => {
    if (!conversation || uploading || (!body.trim() && !attachments.length))
      return;
    actions.send(id, body, attachments);
    setBody("");
    setAttachments([]);
    composer.current?.focus();
  };
  const threadActions = (c) => (
    <div className="thread-actions">
      <button
        onClick={() => {
          actions.thread(c.id, { starred: !c.starred });
          setThreadMenu(null);
        }}
      >
        {c.starred ? "Unstar" : "Star"}
      </button>
      <button
        onClick={() => {
          actions.thread(c.id, { archived: !c.archived });
          setThreadMenu(null);
        }}
      >
        {c.archived ? "Unarchive" : "Archive"}
      </button>
      <button
        onClick={() => {
          actions.readThread(c.id, !!c.unreadCount === false);
          setThreadMenu(null);
        }}
      >
        {c.unreadCount ? "Mark as read" : "Mark as unread"}
      </button>
    </div>
  );
  if (id && !conversation) return <NotFound />;
  return (
    <main
      className={`messages-page ${id ? "has-thread" : ""} ${details ? "has-details" : ""}`}
    >
      <aside className="inbox">
        <div className="row between">
          <h1>Messages</h1>
          <div className="row">
            <button
              className="icon-btn"
              aria-label="Search messages"
              onClick={() => setSearching(!searching)}
            >
              <Icon name="Search" size={20} />
            </button>
            <div className="message-settings" ref={settingsRef}>
              <button className="icon-btn" aria-label="Message settings"
                aria-expanded={settings} onClick={() => setSettings(!settings)}>
                <Icon name="Settings" size={20} />
              </button>
              {settings && <div className="thread-actions">
                <SidLink to="/account-settings/notifications" onClick={() => setSettings(false)}>Notification settings</SidLink>
                <SidLink to="/account-settings/preferences" onClick={() => setSettings(false)}>Language & translation</SidLink>
              </div>}
            </div>
          </div>
        </div>
        {searching && (
          <Field
            label="Search messages"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        <div className="row inbox-filters">
          {["All", "Traveling", "Support"].map((v) => (
            <Chip key={v} active={filter === v} onClick={() => setFilter(v)}>
              {v}
            </Chip>
          ))}
          <button
            className="circle"
            aria-label="More message filters"
            onClick={() => setMoreFilter(!moreFilter)}
          >
            <Icon name="Ellipsis" size={18} />
          </button>
        </div>
        {moreFilter && (
          <div className="chips overflow-filters">
            {["Unread", "Starred", "Archived"].map((v) => (
              <Chip
                key={v}
                active={filter === v}
                onClick={() => {
                  setFilter(v);
                  setMoreFilter(false);
                }}
              >
                {v}
              </Chip>
            ))}
          </div>
        )}
        {!["All", "Traveling", "Support"].includes(filter) && (
          <p className="muted">{filter}</p>
        )}
        <div className="conversation-list">
          {rows.map((c) => {
            const h = state.users.find((u) => u.id === c.hostId),
              listing = state.listings.find((l) => l.id === c.listingId),
              last = state.messages
                .filter((m) => m.conversationId === c.id)
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                .at(-1);
            return (
              <article
                className={`conversation-row ${c.id === id ? "selected" : ""} ${c.unreadCount ? "unread" : ""}`}
                key={c.id}
              >
                <button
                  className="conversation-open"
                  onClick={() => {
                    actions.readThread(c.id);
                    nav(`/messages/${c.id}`);
                  }}
                >
                  <Avatar user={h} size={48} />
                  <div>
                    <div className="row between">
                      <strong>
                        {h?.firstName || "Your host"} {c.starred ? "☆" : ""}
                      </strong>
                      <small>{fmtDate(c.lastMessageAt)}</small>
                    </div>
                    <p className="ellipsis">
                      {last?.deletedAt
                        ? "This message was unsent"
                        : last?.body || "Start a conversation"}
                    </p>
                    <small className="ellipsis">
                      {c.type === "support"
                        ? "Airbnb Support"
                        : c.type === "inquiry"
                          ? "Inquiry"
                          : tripStatus(
                              state.reservations.find(
                                (r) => r.id === c.reservationId,
                              ) || {},
                            )}{" "}
                      · {listing?.city || "Airbnb"}
                    </small>
                  </div>
                  {c.unreadCount > 0 && <i className="message-dot" />}
                </button>
                <button
                  className="thread-overflow icon-btn"
                  aria-label={`Actions for ${h?.firstName || "conversation"}`}
                  onClick={() =>
                    setThreadMenu(threadMenu === c.id ? null : c.id)
                  }
                >
                  <Icon name="Ellipsis" size={18} />
                </button>
                {threadMenu === c.id && threadActions(c)}
              </article>
            );
          })}
          {!rows.length && (
            <Empty
              title={
                filter === "Unread"
                  ? "No unread messages"
                  : "You don’t have any messages"
              }
            >
              <p>When you receive a new message, it will appear here.</p>
            </Empty>
          )}
        </div>
      </aside>
      <section className="thread-pane">
        {conversation ? (
          <>
            <header className="thread-header row between">
              <div className="row">
                <SidLink
                  className="icon-btn mobile-back"
                  aria-label="Back to messages"
                  to="/messages"
                >
                  <Icon name="ChevronLeft" />
                </SidLink>
                <Avatar user={host} />
                <div>
                  <strong>{host?.firstName || "Your host"}</strong>
                  <small>
                    Response time: {host?.responseTimeText || "within a day"}
                  </small>
                </div>
              </div>
              <div className="row">
                <button
                  className="icon-btn"
                  aria-label={
                    conversation.starred
                      ? "Unstar conversation"
                      : "Star conversation"
                  }
                  onClick={() =>
                    actions.thread(id, { starred: !conversation.starred })
                  }
                >
                  <Icon
                    name="Star"
                    size={20}
                    fill={conversation.starred ? "#222" : "none"}
                  />
                </button>
                <Button variant="text" onClick={() => setDetails(!details)}>
                  {details ? "Hide details" : "Details"}
                </Button>
                <button
                  className="icon-btn"
                  aria-label="Conversation actions"
                  onClick={() =>
                    setThreadMenu(threadMenu === "header" ? null : "header")
                  }
                >
                  <Icon name="Ellipsis" />
                </button>
              </div>
              {threadMenu === "header" && threadActions(conversation)}
            </header>
            <div className="thread-body">
              {messages.map((m, index) => {
                const mine = m.senderId === "user_001",
                  sender = mine
                    ? state.currentUser
                    : state.users.find((u) => u.id === m.senderId),
                  day = m.createdAt?.slice(0, 10),
                  previous = messages[index - 1]?.createdAt?.slice(0, 10);
                return (
                  <React.Fragment key={m.id}>
                    {day !== previous && (
                      <div className="day-separator">
                        {fmtDate(m.createdAt)}
                      </div>
                    )}
                    {m.kind === "system" ? (
                      <div className="system-message">{m.body}</div>
                    ) : (
                      <article className={`message ${mine ? "mine" : ""}`}>
                        <div className="message-author">
                          {!mine && <Avatar user={sender} size={28} />}
                          <strong>{sender?.firstName || "Guest"}</strong>
                          <small>
                            {new Date(m.createdAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </small>
                        </div>
                        {editing === m.id ? (
                          <div className="message-edit">
                            <textarea
                              aria-label="Edit message"
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                            />
                            <Button onClick={() => setEditing(null)}>
                              Cancel
                            </Button>
                            <Button
                              variant="dark"
                              disabled={!editBody.trim()}
                              onClick={() => {
                                actions.message(m.id, {
                                  body: editBody.trim(),
                                  editedAt: new Date().toISOString(),
                                });
                                setEditing(null);
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <div className="bubble">
                            {m.deletedAt ? (
                              <em>This message was unsent</em>
                            ) : (
                              <>
                                <p>{m.body}</p>
                                {(m.attachments || []).map((a, i) => (
                                  <button
                                    className="image-message"
                                    key={i}
                                    onClick={() => setPhoto(a.url)}
                                  >
                                    <img
                                      src={withSid(a.url)}
                                      alt={a.name || "Photo attachment"}
                                    />
                                  </button>
                                ))}
                                {m.editedAt && <small>Edited</small>}
                                {m.translated && (
                                  <small>
                                    Translated from Spanish ·{" "}
                                    <button
                                      onClick={() =>
                                        actions.message(m.id, {
                                          translated: false,
                                        })
                                      }
                                    >
                                      Show original
                                    </button>
                                  </small>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        {!m.deletedAt && (
                          <div className="message-controls">
                            <button
                              className="icon-btn"
                              aria-label="React to message"
                              onClick={() =>
                                setMessageMenu(
                                  messageMenu === m.id ? null : m.id,
                                )
                              }
                            >
                              <Icon name="SmilePlus" size={16} />
                            </button>
                            <button
                              className="icon-btn"
                              aria-label="Message actions"
                              onClick={() =>
                                setMessageMenu(
                                  messageMenu === m.id ? null : m.id,
                                )
                              }
                            >
                              <Icon name="Ellipsis" size={16} />
                            </button>
                          </div>
                        )}
                        {messageMenu === m.id && !m.deletedAt && (
                          <div className="message-action-menu">
                            <div className="row">
                              {["👍", "❤️", "😂", "😮", "😢", "🙏"].map(
                                (emoji) => (
                                  <button
                                    key={emoji}
                                    aria-label={"React " + emoji}
                                    onClick={() => {
                                      actions.react(m.id, emoji);
                                      setMessageMenu(null);
                                    }}
                                  >
                                    {emoji}
                                  </button>
                                ),
                              )}
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard
                                  .writeText(m.body || "")
                                  .then(() => notify("Message copied"))
                                  .catch(() =>
                                    notify("Select the message text to copy"),
                                  );
                                setMessageMenu(null);
                              }}
                            >
                              Copy
                            </button>
                            {mine ? (
                              <>
                                {new Date() - new Date(m.createdAt) <=
                                  15 * 60000 && (
                                  <button
                                    onClick={() => {
                                      setEditing(m.id);
                                      setEditBody(m.body || "");
                                      setMessageMenu(null);
                                    }}
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setUnsend(m.id);
                                    setMessageMenu(null);
                                  }}
                                >
                                  Unsend
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  actions.message(m.id, {
                                    translated: !m.translated,
                                  });
                                  setMessageMenu(null);
                                }}
                              >
                                {m.translated ? "Show original" : "Translate"}
                              </button>
                            )}
                          </div>
                        )}
                        {!!m.reactions?.length && (
                          <div className="reactions">
                            {[...new Set(m.reactions.map((x) => x.emoji))].map(
                              (emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => actions.react(m.id, emoji)}
                                  className={
                                    m.reactions.some(
                                      (x) =>
                                        x.emoji === emoji &&
                                        x.userId === "user_001",
                                    )
                                      ? "own"
                                      : ""
                                  }
                                >
                                  {emoji}{" "}
                                  {
                                    m.reactions.filter((x) => x.emoji === emoji)
                                      .length
                                  }
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </article>
                    )}
                  </React.Fragment>
                );
              })}
              <div ref={end} />
            </div>
            <div className="composer-area">
              {attachments.length > 0 && (
                <div className="attachment-preview">
                  {attachments.map((a, i) => (
                    <div key={i}>
                      <img src={withSid(a.url)} alt={a.name} />
                      <button
                        aria-label="Remove attachment"
                        onClick={() =>
                          setAttachments((v) => v.filter((_, n) => n !== i))
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="composer">
                <button
                  className="icon-btn"
                  aria-label="Attach photo"
                  disabled={uploading}
                  onClick={() => file.current.click()}
                >
                  <Icon name="ImagePlus" />
                </button>
                <input
                  ref={file}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={async (e) => {
                    setUploading(true);
                    try {
                      setAttachments((v) => [...v]);
                      const uploaded = await uploadFiles(e.target.files);
                      setAttachments((v) => [...v, ...uploaded]);
                    } catch (err) {
                      notify(err.message);
                    } finally {
                      setUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
                <textarea
                  ref={composer}
                  rows={1}
                  aria-label="Write a message"
                  placeholder={
                    uploading ? "Uploading photo…" : "Write a message…"
                  }
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height =
                      Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onFocus={() => {
                    if (conversation.unreadCount) actions.readThread(id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button
                  className="send-button"
                  aria-label="Send message"
                  disabled={uploading || (!body.trim() && !attachments.length)}
                  onClick={send}
                >
                  <Icon name="ArrowUp" size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty title="Select a conversation">
            <p>Your conversations with hosts and Airbnb Support are here.</p>
          </Empty>
        )}
      </section>
      {conversation && details && (
        <aside className="message-details">
          <div className="row between">
            <h2>{conversation.type === "support" ? "Airbnb Support" : "Reservation"}</h2>
            <button className="icon-btn" aria-label="Close reservation details" onClick={() => setDetails(false)}>
              <Icon name="X" size={18} />
            </button>
          </div>
          {l && (
            <>
              {l.photos?.[0] && (
                <img
                  className="details-photo"
                  src={l.photos[0]}
                  alt={l.title}
                />
              )}
              <h3>{l.title}</h3>
            </>
          )}
          {r ? (
            <>
              <span className="status">{tripStatus(r)}</span>
              <p>
                <strong>Check-in / Checkout</strong>
                <br />
                {dateRange(r.checkIn, r.checkOut)}
              </p>
              <p>{guestText(r.guests)}</p>
              <p>
                Confirmation code
                <br />
                {r.confirmationCode}
              </p>
              <p>
                Total cost <strong>{money(r.priceBreakdown?.total)}</strong>
              </p>
              <div className="stack">
                <SidLink className="btn outline" to={`/trips/${r.id}`}>
                  View trip
                </SidLink>
                <SidLink className="text" to={`/trips/${r.id}/receipt`}>
                  Get receipt
                </SidLink>
                {r.status === "pending" && (
                  <Button onClick={() => setWithdraw(true)}>
                    Withdraw request
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p>
              {conversation.type === "inquiry"
                ? "Ask your host about the home and plan your visit."
                : "We’re here to help with your stay."}
            </p>
          )}
          {l && (
            <SidLink className="btn outline full" to={roomUrl(l)}>
              {r ? "Show listing" : "Book"}
            </SidLink>
          )}
        </aside>
      )}
      {unsend && (
        <Confirm
          title="Unsend this message?"
          label="Unsend"
          onClose={() => setUnsend(null)}
          onConfirm={() => {
            actions.message(unsend, { deletedAt: new Date().toISOString() });
            setUnsend(null);
          }}
        >
          <p>The message will be removed from this conversation.</p>
        </Confirm>
      )}
      {photo && (
        <Modal title="Photo attachment" onClose={() => setPhoto(null)}>
          <img src={withSid(photo)} alt="Photo attachment" />
        </Modal>
      )}
      {withdraw && r && (
        <Withdraw reservation={r} onClose={() => setWithdraw(false)} />
      )}
    </main>
  );
}
export function NewMessage() {
  const { state, actions } = useApp(),
    loc = useLocation(),
    nav = useSidNavigate(),
    id = new URLSearchParams(loc.search).get("listing"),
    l = state.listings.find((l) => l.id === id),
    [body, setBody] = useState(""),
    [dates, setDates] = useState({ checkIn: null, checkOut: null }),
    [guests, setGuests] = useState({
      adults: 2,
      children: 0,
      infants: 0,
      pets: 0,
    }),
    [modal, setModal] = useState(null);
  useEffect(() => {
    const c = state.conversations.find(
      (c) => c.listingId === id && c.hostId === l?.hostId,
    );
    if (c) nav(`/messages/${c.id}`, { replace: true });
  }, [id]);
  if (!l) return <NotFound />;
  const host = state.users.find((u) => u.id === l.hostId);
  return (
    <main className="page narrow">
      <div className="checkout-columns">
        <div>
          {l.photos?.[0] && (
            <img className="trip-hero" src={l.photos[0]} alt={l.title} />
          )}
          <h2>{l.title}</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim()) return;
            const cid = actions.inquiry(id, body, { ...dates, guests });
            nav(`/messages/${cid}`);
          }}
        >
          <h1>Message {host?.firstName || "your host"}</h1>
          <p>Ask a question before you book.</p>
          <div className="chips">
            <Button type="button" onClick={() => setModal("dates")}>
              {dates.checkIn
                ? dateRange(dates.checkIn, dates.checkOut)
                : "Add dates"}
            </Button>
            <Button type="button" onClick={() => setModal("guests")}>
              {guestText(guests)}
            </Button>
          </div>
          <Field
            label="Message"
            as="textarea"
            maxLength={4000}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button variant="dark" disabled={!body.trim()}>
            Send message
          </Button>
        </form>
      </div>
      {modal && (
        <Modal
          title={modal === "dates" ? "Add dates" : "Guests"}
          wide={modal === "dates"}
          onClose={() => setModal(null)}
          footer={
            <Button variant="dark" onClick={() => setModal(null)}>
              Done
            </Button>
          }
        >
          {modal === "dates" ? (
            <Calendar {...dates} onChange={setDates} />
          ) : (
            <Guests
              value={guests}
              onChange={setGuests}
              max={l.maxGuests}
              allowsPets={l.allowsPets}
            />
          )}
        </Modal>
      )}
    </main>
  );
}
