import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  X,
  MoreHorizontal,
  BookmarkPlus,
  Bookmark,
  Lock,
  MessageCircle,
  Hand,
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
} from "lucide-react";
import { withSid } from "../utils/dataManager";
import { useStore } from "../store/AppStore";
import { colors, coverDataUri } from "../utils/art";
import { compact, dateLabel, storyUrl, listUrl } from "../utils/urls";
import { isFollowing, myClapFor, responsesFor } from "../store/selectors";
export function A({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />;
}
export function useNav() {
  const n = useNavigate();
  return (to, opts) => n(typeof to === "number" ? to : withSid(to), opts);
}
export function Avatar({ user, size = 32 }) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: user?.avatarColor || "#C7C7C7",
        fontSize: Math.max(10, size * 0.32),
      }}
    >
      {user?.name
        ?.split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("") || "?"}
    </span>
  );
}
export function PubLogo({ pub, size = 32 }) {
  return (
    <span
      className="avatar publogo"
      style={{
        width: size,
        height: size,
        background: pub?.logoColor || "#C7C7C7",
        fontSize: size * 0.32,
      }}
    >
      {pub?.name
        ?.split(" ")
        .filter((word) => !["the", "from", "and", "of", "in"].includes(word.toLowerCase()))
        .map((x) => x[0])
        .slice(0, 2)
        .join("") || "?"}
    </span>
  );
}
export function Logo({ small = false }) {
  return (
    <A to="/" className="logo" aria-label="Medium home">
      <img src="/favicon.svg" alt="" width="34" height="19" />
      {!small && <span>Medium</span>}
    </A>
  );
}
export function Button({ variant = "green", className = "", ...p }) {
  return <button className={`btn btn-${variant} ${className}`} {...p} />;
}
export function IconButton({ label, children, ...p }) {
  return (
    <button className="icon-btn" aria-label={label} title={label} {...p}>
      {children}
    </button>
  );
}
const UI = createContext(null);
export const useUI = () => useContext(UI);
export function UIProvider({ children }) {
  const [toast, setToast] = useState(""),
    [hiddenStoryIds, setHiddenStoryIds] = useState([]),
    [modal, setModal] = useState(null),
    modalDestination = useRef(null),
    timer = useRef(),
    location = useLocation();
  const notify = (text) => {
    setToast(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3000);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (modalDestination.current === location.pathname) {
      modalDestination.current = null;
    } else setModal(null);
  }, [location.pathname]);
  return (
    <UI.Provider
      value={{
        notify,
        hiddenStoryIds,
        hideStory: (id) => setHiddenStoryIds((ids) => [...ids, id]),
        modal,
        setModal,
        modalOnRoute: (content, pathname) => {
          modalDestination.current = pathname;
          setModal(content);
        },
        close: () => setModal(null),
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {modal && <Modal onClose={() => setModal(null)}>{modal}</Modal>}
    </UI.Provider>
  );
}
export function Modal({ children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    el?.querySelector("input,textarea,button,select")?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const f = [
          ...el.querySelectorAll("button,input,textarea,select,a[href]"),
        ].filter((x) => !x.disabled);
        if (!f.length) return;
        e.preventDefault();
        const i = f.indexOf(document.activeElement);
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      prev?.focus?.();
    };
  }, []);
  return (
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        <IconButton label="Close" onClick={onClose}>
          <X />
        </IconButton>
        {children}
      </section>
    </div>
  );
}
export function Menu({
  label = "More options",
  children,
  icon = <MoreHorizontal />,
}) {
  const [open, setOpen] = useState(false),
    ref = useRef();
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (
        e.key === "Escape" ||
        (e.type === "pointerdown" && !ref.current?.contains(e.target))
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div className="popover" ref={ref}>
      <IconButton
        label={label}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {icon}
      </IconButton>
      {open && (
        <div
          className="menu"
          onClick={(e) => {
            if (
              e.target.closest("button,a") &&
              !e.target.closest("[data-keep]")
            )
              setOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
export function Item({ children, danger = false, ...p }) {
  return (
    <button className={`menu-item ${danger ? "danger" : ""}`} {...p}>
      {children}
    </button>
  );
}
export function Tabs({ items, active, onSelect, scrollable = false }) {
  const ref = useRef(null),
    [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    if (!scrollable) return;
    const el = ref.current,
      check = () =>
        setEdges({
          left: el.scrollLeft > 1,
          right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
        });
    check();
    el.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [scrollable, items.length]);
  const tabs = (
    <div ref={ref} className="tabs" role="tablist">
      {items.map((x) => (
        <button
          key={x.id}
          role="tab"
          aria-selected={active === x.id}
          className={active === x.id ? "active" : ""}
          onClick={() => onSelect(x.id)}
        >
          {x.label}
          {x.count !== undefined && <span> {x.count}</span>}
        </button>
      ))}
    </div>
  );
  if (!scrollable) return tabs;
  return (
    <div className="tabs-wrap">
      {edges.left && (
        <IconButton
          label="Previous topics"
          onClick={() =>
            ref.current.scrollBy({ left: -240, behavior: "smooth" })
          }
        >
          <ChevronLeft />
        </IconButton>
      )}
      {tabs}
      {edges.right && (
        <IconButton
          label="More topics"
          onClick={() =>
            ref.current.scrollBy({ left: 240, behavior: "smooth" })
          }
        >
          <ChevronRight />
        </IconButton>
      )}
    </div>
  );
}
export const Badge = ({ status }) => (
  <span className={`badge ${status}`}>
    {{
      pending: "Pending review",
      in_review: "In review",
      edits_requested: "Edits requested",
    }[status] || status?.replaceAll("_", " ")}
  </span>
);
export function Empty({ children = "No stories here yet." }) {
  return <div className="empty">{children}</div>;
}
export function Confirm({
  title = "Delete story?",
  text = "Deleted stories are gone forever. Are you sure?",
  onConfirm,
  label = "Delete",
}) {
  const { close } = useUI();
  return (
    <>
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="actions">
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm();
            close();
          }}
        >
          {label}
        </Button>
      </div>
    </>
  );
}
export function Follow({ type, id }) {
  const { state, actions } = useStore(),
    following = isFollowing(state, type, id);
  if (
    (type === "user" && id === state.currentUserId) ||
    (type === "publication" &&
      (state.publications ?? []).find((p) => p.id === id)?.ownerId ===
        state.currentUserId)
  )
    return null;
  return (
    <Button
      variant={following ? "outline" : "black"}
      className={following ? "following" : ""}
      onClick={() => actions.follow(type, id)}
    >
      <span>{following ? "Following" : "Follow"}</span>
      {following && <span className="hover-label">Unfollow</span>}
    </Button>
  );
}
export function Clap({ type = "story", target }) {
  const { state, actions } = useStore(),
    { notify } = useUI(),
    [bubble, setBubble] = useState(false),
    hold = useRef(),
    delay = useRef(),
    fade = useRef(),
    own = type === "story" && target?.authorId === state.currentUserId;
  const mine = myClapFor(state, type, target?.id),
    click = () => {
      if (!actions.clap(type, target?.id)) {
        notify("You've clapped the max 50 times");
        return;
      }
      setBubble(true);
      clearTimeout(fade.current);
      fade.current = setTimeout(() => setBubble(false), 1000);
    };
  const stop = () => {
    clearTimeout(delay.current);
    clearInterval(hold.current);
  };
  useEffect(
    () => () => {
      stop();
      clearTimeout(fade.current);
    },
    [],
  );
  return (
    <span className="clap">
      <button
        className={`icon-btn ${mine ? "filled" : ""}`}
        title={own ? "You can’t clap for your own story" : "clap"}
        aria-label="clap"
        disabled={own}
        onClick={click}
        onPointerDown={() => {
          delay.current = setTimeout(() => {
            click();
            hold.current = setInterval(click, 120);
          }, 400);
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        <Hand size={21} />
        {bubble && <span className="bubble">+{mine?.count || 1}</span>}
      </button>
      <small>{compact((target?.clapCount || 0) + (mine?.count || 0))}</small>
    </span>
  );
}
export function ListForm({ list, storyId }) {
  const { actions } = useStore(),
    { close, notify } = useUI(),
    [name, setName] = useState(list?.name || ""),
    [description, setDescription] = useState(list?.description || ""),
    [privateList, setPrivate] = useState(list?.visibility === "private");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const fields = {
          name: name.trim(),
          description,
          visibility: privateList ? "private" : "public",
        };
        if (list) actions.patch("lists", list.id, fields);
        else actions.createList(fields, storyId);
        close();
        notify(list ? "Changes saved" : "List created");
      }}
    >
      <h2>{list ? "Edit list info" : "Create new list"}</h2>
      <label>
        Name
        <input
          required
          maxLength={60}
          disabled={list?.isDefault}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <small>{name.length}/60</small>
      <label>
        Description
        <textarea
          maxLength={280}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={privateList}
          onChange={(e) => setPrivate(e.target.checked)}
        />
        Make it private
      </label>
      <div className="actions">
        <Button variant="outline-green" type="button" onClick={close}>
          Cancel
        </Button>
        <Button disabled={!name.trim()}>{list ? "Save" : "Create"}</Button>
      </div>
    </form>
  );
}
export function BookmarkPicker({ story }) {
  const { state, actions } = useStore(),
    { setModal, notify } = useUI(),
    lists = (state.lists ?? [])
      .filter((l) => l.ownerId === state.currentUserId)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
    saved = lists.some((l) =>
      (l.items ?? []).some((i) => i.storyId === story.id),
    );
  return (
    <Menu
      label="Add to list"
      icon={saved ? <Bookmark fill="currentColor" /> : <BookmarkPlus />}
    >
      {lists.map((l) => (
        <label className="picker-row" data-keep="true" key={l.id}>
          <input
            type="checkbox"
            checked={(l.items ?? []).some((i) => i.storyId === story.id)}
            onChange={(e) => {
              actions.toggleList(l.id, story.id);
              notify(`${e.target.checked ? "Saved to" : "Removed from"} ${l.name}`);
            }}
          />
          {l.name}
          {l.visibility === "private" && <Lock size={14} />}
        </label>
      ))}
      <Item onClick={() => setModal(<ListForm storyId={story.id} />)}>
        <Plus size={16} />
        Create new list
      </Item>
    </Menu>
  );
}
export function StoryLink({ story, children, onClick, ...p }) {
  const { state, actions } = useStore();
  return (
    <A
      to={storyUrl(story, state)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) actions.recordRead(story.id);
      }}
      {...p}
    >
      {children}
    </A>
  );
}
export function StoryCard({ story, variant = "feed" }) {
  const { state, actions } = useStore(),
    nav = useNav(),
    { notify, hiddenStoryIds = [], hideStory, setModal } = useUI(),
    [hidden, setHidden] = useState(false),
    author = (state.users ?? []).find((x) => x.id === story?.authorId),
    pub = (state.publications ?? []).find((x) => x.id === story?.publicationId);
  if (!story || hidden || hiddenStoryIds.includes(story.id)) return null;
  const totalClaps =
      (story.clapCount || 0) +
      (myClapFor(state, "story", story.id)?.count || 0),
    totalResponses = responsesFor(state, "story", story.id).length,
    mine = story.authorId === state.currentUserId;
  const mute = (type, id) => {
    actions.add("mutes", {
      id: "mut_" + Date.now(),
      userId: state.currentUserId,
      targetType: type,
      targetId: id,
      createdAt: new Date().toISOString(),
    });
    notify(`${type === "user" ? author?.name : pub?.name} is muted`);
  };
  return (
    <article className={`story-card ${variant}`}>
      <div className="story-card-main">
        <div className="byline">
          <Avatar user={author} size={20} />
          {pub ? (
            <>
              <span>In</span>
              <A to={"/" + pub.slug}>{pub.name}</A>
              <span>by</span>
            </>
          ) : null}
          <A to={"/@" + (author?.username || "unknown")}>
            {author?.name || "Unknown author"}
          </A>
        </div>
        <StoryLink story={story}>
          <h2>{story.previewTitle || story.title || "Untitled story"}</h2>
          {variant !== "compact" && (
            <p className="subtitle">
              {story.previewSubtitle || story.subtitle}
            </p>
          )}
        </StoryLink>
        <div className="meta">
          {story.memberOnly && <span className="star">✦</span>}
          <span>{dateLabel(story.publishedAt || story.updatedAt)}</span>
          {variant !== "compact" && (
            <>
              {totalClaps > 0 && (
                <>
                  <Hand size={14} />
                  <span>{compact(totalClaps)}</span>
                </>
              )}
              {totalResponses > 0 && (
                <>
                  <MessageCircle size={14} />
                  <span>{totalResponses}</span>
                </>
              )}
            </>
          )}
          <span className="grow" />
          {variant !== "compact" && (
            <>
              {!mine && !["grid", "grid-card"].includes(variant) && <IconButton
                label="Show less like this"
                onClick={() => {
                  setHidden(true);
                  hideStory?.(story.id);
                  notify("Thanks — we’ll show fewer stories like this.");
                }}
              >
                <CircleMinus size={19} />
              </IconButton>}
              <BookmarkPicker story={story} />
              <Menu>
                {mine ? <>
                  <Item onClick={() => nav("/p/" + story.id + "/edit")}>Edit story</Item>
                  <Item onClick={() => nav("/p/" + story.id + "/settings")}>Story settings</Item>
                  <Item onClick={() => nav("/me/stats?story=" + story.id)}>Story stats</Item>
                </> : <>
                <Item onClick={() => actions.follow("user", story.authorId)}>
                  Follow author
                </Item>
                {pub && (
                  <Item onClick={() => actions.follow("publication", pub.id)}>
                    Follow publication
                  </Item>
                )}
                <Item onClick={() => mute("user", story.authorId)}>
                  Mute author
                </Item>
                {pub && (
                  <Item onClick={() => mute("publication", pub.id)}>
                    Mute publication
                  </Item>
                )}
                <Item
                  onClick={() => {
                    setHidden(true);
                    hideStory?.(story.id);
                    notify("Thanks — we’ll show fewer stories like this.");
                  }}
                >
                  Show less like this
                </Item>
                <Item onClick={() => setModal(<ReportModal />)}>
                  Report story…
                </Item>
                </>}
              </Menu>
            </>
          )}
        </div>
      </div>
      {variant !== "compact" && story.coverImage && (
        <StoryLink story={story} className="thumb">
          <img
            src={coverDataUri(story.previewImage || story.coverImage)}
            alt=""
          />
        </StoryLink>
      )}
    </article>
  );
}
export function ListCard({ list }) {
  const { state } = useStore();
  return (
    <A className="list-card" to={listUrl(list, state)}>
      <div>
        <div className="byline">
          <Avatar
            user={(state.users ?? []).find((x) => x.id === list.ownerId)}
            size={20}
          />
          {(state.users ?? []).find((x) => x.id === list.ownerId)?.name ||
            "Unknown writer"}
        </div>
        <h2>{list.name}</h2>
        <small>
          {(list.items ?? []).length} stories{" "}
          {list.visibility === "private" ? "· 🔒" : ""}
        </small>
      </div>
      <div className="list-covers">
        {(list.items ?? []).slice(0, 3).map((i, j) => (
          <img
            key={i.storyId + j}
            src={coverDataUri(
              (state.stories ?? []).find((s) => s.id === i.storyId)
                ?.coverImage || i.storyId,
            )}
            alt=""
          />
        ))}
      </div>
    </A>
  );
}
export function Footer() {
  return (
    <footer>
      {[
        "Help",
        "Status",
        "About",
        "Careers",
        "Press",
        "Blog",
        "Privacy",
        "Rules",
        "Terms",
        "Text to speech",
      ].map((x) => (
        <a key={x} href="#" onClick={(e) => e.preventDefault()}>
          {x}
        </a>
      ))}
    </footer>
  );
}
export function ReportModal({ target = "story" }) {
  const { close, notify } = useUI(),
    [reason, setReason] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (reason) {
          close();
          notify("Thanks for reporting");
        }
      }}
    >
      <h2>Report {target}</h2>
      <p>What’s wrong with this {target}?</p>
      {[
        "Spam or misleading content",
        "Harassment or hateful content",
        "Copyright infringement",
        "Something else",
      ].map((x) => (
        <label className="check" key={x}>
          <input
            type="radio"
            name="reportReason"
            checked={reason === x}
            onChange={() => setReason(x)}
          />
          {x}
        </label>
      ))}
      <div className="actions">
        <Button type="button" variant="text" onClick={close}>
          Cancel
        </Button>
        <Button disabled={!reason}>Report</Button>
      </div>
    </form>
  );
}
