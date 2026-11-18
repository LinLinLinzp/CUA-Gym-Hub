import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Menu as MenuIcon,
  Search,
  Bell,
  SquarePen,
  Home,
  Library,
  User,
  FileText,
  ChartNoAxesColumn,
} from "lucide-react";
import { useStore } from "../store/AppStore";
import { unreadCount, publishedVisible } from "../store/selectors";
import {
  A,
  useNav,
  Avatar,
  PubLogo,
  Logo,
  IconButton,
  Menu,
  Item,
  useUI,
  StoryLink,
  Footer,
} from "./UI";
export function Shell({ children, focus = false }) {
  const { state, actions, user } = useStore(),
    nav = useNav(),
    { notify } = useUI(),
    loc = useLocation(),
    [q, setQ] = useState(new URLSearchParams(loc.search).get("q") || ""),
    [searchOpen, setSearchOpen] = useState(false),
    [focusSidebar, setFocusSidebar] = useState(false),
    [mobileSidebar, setMobileSidebar] = useState(false),
    [narrow, setNarrow] = useState(
      typeof window !== "undefined" && window.innerWidth < 1080,
    ),
    open = narrow
      ? mobileSidebar
      : focus
        ? focusSidebar
        : state.ui?.sidebarOpen;
  useEffect(() => {
    const resize = () => setNarrow(window.innerWidth < 1080);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const following = (state.follows ?? [])
    .filter((f) => f.targetType !== "topic")
    .slice(0, 8);
  const links = [
    ["Home", "/", Home],
    ["Library", "/me/lists", Library],
    ["Profile", "/@" + user.username, User],
    ["Stories", "/me/stories/drafts", FileText],
    ["Stats", "/me/stats", ChartNoAxesColumn],
  ];
  return (
    <>
      <header className="topbar">
        <IconButton
          label="Toggle sidebar"
          onClick={() => {
            if (narrow) setMobileSidebar(!mobileSidebar);
            else if (focus) setFocusSidebar(!focusSidebar);
            actions.update((s) => {
              s.ui = { ...s.ui, sidebarOpen: !open };
            });
          }}
        >
          <MenuIcon />
        </IconButton>
        <Logo />
        <div className="search-wrap">
          <form
            className="search-pill"
            onSubmit={(e) => {
              e.preventDefault();
              setSearchOpen(false);
              nav("/search?q=" + encodeURIComponent(q));
            }}
          >
            <Search size={20} />
            <input
              placeholder="Search"
              aria-label="Search"
              value={q}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchOpen(false);
              }}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>
          {q && searchOpen && (
            <div className="menu search-results">
              {publishedVisible(state)
                .filter((s) => s.title?.toLowerCase().includes(q.toLowerCase()))
                .slice(0, 5)
                .map((s) => (
                  <StoryLink
                    key={s.id}
                    story={s}
                    onClick={() => setSearchOpen(false)}
                  >
                    {s.title}
                  </StoryLink>
                ))}
              {(state.users ?? [])
                .filter((u) => u.name?.toLowerCase().includes(q.toLowerCase()))
                .slice(0, 3)
                .map((u) => (
                  <A
                    key={u.id}
                    to={"/@" + u.username}
                    onClick={() => setSearchOpen(false)}
                  >
                    {u.name}
                  </A>
                ))}
            </div>
          )}
        </div>
        <span className="grow" />
        <A className="write-link" to="/new-story">
          <SquarePen />
          Write
        </A>
        <A className="bell" aria-label="Notifications" to="/me/notifications">
          <Bell />
          {unreadCount(state) > 0 && <i />}
        </A>
        <Menu label="Account menu" icon={<Avatar user={user} />}>
          {[
            "Profile",
            "Library",
            "Stories",
            "Stats",
            "Settings",
            "Refine recommendations",
            "Manage publications",
            "Help",
            "Membership",
            "Apply to the Partner Program",
            "New publication",
            "Sign out",
          ].map((label, i) => (
            <Item
              key={label}
              onClick={() => {
                const paths = [
                  "/@" + user.username,
                  "/me/lists",
                  "/me/stories",
                  "/me/stats",
                  "/me/settings",
                  "/me/following",
                  "/me/publications",
                ];
                if (paths[i]) nav(paths[i]);
                else if (label === "New publication") nav("/new-publication");
                else if (i === 8) nav("/plans");
                else
                  notify(
                    label === "Sign out"
                      ? "Signing out is disabled in this demo"
                      : i === 7
                        ? "Find inspiration in our writing guides."
                        : "You’re already a member of the Partner Program.",
                  );
              }}
            >
              {label}
            </Item>
          ))}
          <small className="menu-item">ma••••••@fastmail.com</small>
        </Menu>
      </header>
      {open && (
        <aside className="sidebar">
          <nav>
            {links.map(([label, to, Icon]) => (
              <A
                className={
                  (
                    to === "/"
                      ? loc.pathname === "/"
                      : loc.pathname.startsWith(to.split("/drafts")[0])
                  )
                    ? "active"
                    : ""
                }
                key={label}
                to={to}
              >
                <Icon />
                {label}
              </A>
            ))}
          </nav>
          <div className="sidebar-follow">
            <p>Following</p>
            {following.map((f) => {
              const target = (
                state[f.targetType === "user" ? "users" : "publications"] ?? []
              ).find((x) => x.id === f.targetId);
              if (!target) return null;
              return (
                <A
                  key={f.id}
                  to={
                    f.targetType === "user"
                      ? "/@" + target.username
                      : "/" + target.slug
                  }
                >
                  {f.targetType === "user" ? (
                    <Avatar user={target} size={24} />
                  ) : (
                    <PubLogo pub={target} size={24} />
                  )}
                  <span>{target.name}</span>
                  {(state.stories ?? []).some(
                    (story) =>
                      story.status === "published" &&
                      (f.targetType === "user"
                        ? story.authorId === target.id
                        : story.publicationId === target.id) &&
                      new Date() - new Date(story.publishedAt) < 7 * 864e5,
                  ) && <i className="dot" />}
                </A>
              );
            })}
            {!following.length && (
              <p>Find writers and publications to follow.</p>
            )}
            <A className="muted" to="/me/following">
              See suggestions
            </A>
          </div>
        </aside>
      )}
      <div
        className={`workspace ${open ? "with-sidebar" : ""} ${focus ? "focus-layout" : ""}`}
      >
        {children}
      </div>
    </>
  );
}
