import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { Logo, SidLink, useSidNavigate } from "./navigation";
import SearchBar from "./SearchBar";
import { Avatar, Icon, Modal, Chip, Switch } from "./ui";
import { searchUrl } from "../utils/search";
export function LanguageModal({ onClose }) {
  const { state, actions } = useApp(),
    [tab, setTab] = useState("Language and region");
  return (
    <Modal title="Language and currency" onClose={onClose}>
      <div className="tabs">
        {["Language and region", "Currency"].map((t) => (
          <button
            key={t}
            className={t === tab ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="row between">
        <p>
          Translation
          <br />
          <small>Automatically translate descriptions and reviews</small>
        </p>
        <Switch
          label="Automatic translation"
          checked={state.preferences.translateAutomatically}
          onChange={(v) => actions.preference({ translateAutomatically: v })}
        />
      </div>
      <h2>
        {tab === "Currency"
          ? "Choose a currency"
          : "Choose a language and region"}
      </h2>
      <div className="chips">
        {(tab === "Currency"
          ? [
              ["USD", "US dollar · $"],
              ["EUR", "Euro · €"],
              ["GBP", "Pound sterling · £"],
              ["CAD", "Canadian dollar · $"],
              ["MXN", "Mexican peso · $"],
            ]
          : [
              ["en-US", "English · United States"],
              ["es", "Español"],
              ["fr", "Français"],
              ["pt", "Português"],
              ["de", "Deutsch"],
              ["it", "Italiano"],
              ["ja", "日本語"],
              ["zh", "中文"],
            ]
        ).map(([value, label]) => (
          <Chip
            key={value}
            active={
              state.preferences[
                tab === "Currency" ? "currency" : "language"
              ] === value
            }
            onClick={() =>
              actions.preference({
                [tab === "Currency" ? "currency" : "language"]: value,
              })
            }
          >
            {label}
          </Chip>
        ))}
      </div>
    </Modal>
  );
}
function TabArt({ type }) {
  return (
    <svg viewBox="0 0 64 56" width="48" height="46" aria-hidden="true">
      <defs>
        <linearGradient id={"g" + type} x2="1" y2="1">
          <stop
            stopColor={
              type === "Homes"
                ? "#ffe0b3"
                : type === "Experiences"
                  ? "#ffb3bd"
                  : "#e9dfbb"
            }
          />
          <stop
            offset="1"
            stopColor={
              type === "Homes"
                ? "#b86844"
                : type === "Experiences"
                  ? "#b9224f"
                  : "#8b825e"
            }
          />
        </linearGradient>
      </defs>
      {type === "Homes" ? (
        <>
          <path d="M10 28L32 9l22 19v23H10z" fill="#e0d2c4" />
          <path d="M5 27L32 3l27 24-5 5L32 13 10 32z" fill={`url(#g${type})`} />
          <path d="M27 32h12v19H27z" fill="#806c57" />
          <path d="M14 33h8v9h-8zm29-1h7v10h-7z" fill="#9ec7c9" />
        </>
      ) : type === "Experiences" ? (
        <>
          <path
            d="M14 19C14-4 51-4 51 19c0 13-13 23-18 25-6-4-19-14-19-25z"
            fill={`url(#g${type})`}
          />
          <path d="M32 2c-10 9-10 27 1 42 11-20 10-33-1-42z" fill="#ed687a" />
          <path d="M27 46h12l-2 9h-8z" fill="#ac8151" />
          <path d="M25 38l4 9m10-9-3 9" stroke="#755f50" />
        </>
      ) : (
        <>
          <ellipse cx="32" cy="45" rx="26" ry="5" fill="#ccc5b1" />
          <path d="M9 42c1-28 45-28 46 0z" fill={`url(#g${type})`} />
          <path d="M28 16h8v5h-8zm-20 27h48v4H8z" fill="#6b6559" />
          <path
            d="M22 29c-3 2-5 6-5 9"
            fill="none"
            stroke="white"
            strokeWidth="3"
            opacity=".5"
          />
        </>
      )}
    </svg>
  );
}
export function Header({ home = false, simple = false }) {
  const { state, unreadMessageCount, unreadNotificationCount } = useApp(),
    [menu, setMenu] = useState(false),
    [language, setLanguage] = useState(false),
    [compact, setCompact] = useState(false),
    loc = useLocation(),
    menuRef = useRef();
  useEffect(() => {
    const scroll = () => setCompact(window.scrollY > 80);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => setMenu(false), [loc.pathname]);
  useEffect(() => {
    const outside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenu(false);
    };
    const key = (e) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <>
      <header
        className={`site-header ${home && !compact ? "home-header" : ""} ${simple ? "simple-header" : ""}`}
      >
        <div className="header-row">
          <Logo />
          {!simple &&
            (home && !compact ? (
              <nav className="home-tabs">
                {["Homes", "Experiences", "Services"].map((t) => (
                  <SidLink
                    key={t}
                    to={t === "Homes" ? "/" : "/" + t.toLowerCase()}
                    className={t === "Homes" ? "active" : ""}
                  >
                    <TabArt type={t} />
                    {t}
                  </SidLink>
                ))}
              </nav>
            ) : (
              <SearchBar variant="compact" />
            ))}
          {!simple && (
            <div className="header-actions">
              <SidLink className="host-link" to="/host/homes">
                Become a host
              </SidLink>
              <button
                className="icon-btn"
                aria-label="Choose language and currency"
                onClick={() => setLanguage(true)}
              >
                <Icon name="Globe" size={20} />
              </button>
              <div className="account" ref={menuRef}>
                <button
                  className="account-toggle"
                  aria-label="Account menu"
                  aria-expanded={menu}
                  onClick={() => setMenu(!menu)}
                >
                  <Icon name="Menu" size={18} />
                  <Avatar user={state.currentUser} size={30} />
                  {unreadMessageCount + unreadNotificationCount > 0 && (
                    <i className="unread-dot" />
                  )}
                </button>
                {menu && (
                  <div className="account-menu">
                    {[
                      ["Wishlists", "/wishlists"],
                      ["Trips", "/trips"],
                      [
                        `Messages${unreadMessageCount ? " · " + unreadMessageCount : ""}`,
                        "/messages",
                      ],
                      [
                        `Notifications${unreadNotificationCount ? " · " + unreadNotificationCount : ""}`,
                        "/notifications",
                      ],
                      ["Profile", "/users/show/user_001"],
                      ["Account", "/account-settings"],
                      ["Help Center", "/help"],
                      ["Become a host", "/host/homes"],
                      ["Refer a host", "/host/homes"],
                      ["Find a co-host", "/host/homes"],
                    ].map(([label, path], i) => (
                      <SidLink
                        className={`${i < 5 ? "bold" : ""} ${i === 5 || i === 7 ? "menu-divider" : ""}`}
                        key={label}
                        to={path}
                      >
                        {label}
                      </SidLink>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {home && !compact && !simple && (
          <div className="header-search">
            <SearchBar />
          </div>
        )}
      </header>
      {language && <LanguageModal onClose={() => setLanguage(false)} />}
    </>
  );
}
export function Footer() {
  const { state } = useApp(),
    [tab, setTab] = useState("Popular"),
    [language, setLanguage] = useState(false),
    tabs = [
      "Popular",
      "Arts & culture",
      "Outdoors",
      "Mountains",
      "Beach",
      "Unique stays",
      "Categories",
      "Things to do",
    ];
  const columns = {
    Support: [
      "Help Center",
      "Get help with a safety issue",
      "AirCover",
      "Anti-discrimination",
      "Disability support",
      "Cancellation options",
      "Report neighborhood concern",
    ],
    Hosting: [
      "Airbnb your home",
      "AirCover for Hosts",
      "Hosting resources",
      "Community forum",
      "Hosting responsibly",
      "Join a free Hosting class",
    ],
    Airbnb: [
      "Newsroom",
      "New features",
      "Careers",
      "Investors",
      "Gift cards",
      "Airbnb.org emergency stays",
    ],
  };
  return (
    <footer className="site-footer">
      <div className="inspiration">
        <h2>Inspiration for future getaways</h2>
        <div className="tabs">
          {tabs.map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="destination-grid">
          {state.destinations.map((d, i) => (
            <SidLink
              key={d.id}
              to={searchUrl(
                {
                  query: d.name,
                  destinationId: d.id,
                  filters: {
                    category:
                      tab === "Beach"
                        ? "beachfront"
                        : tab === "Mountains"
                          ? "cabins"
                          : null,
                  },
                },
                state,
              )}
            >
              <strong>{d.name}</strong>
              <small>
                {tab === "Things to do"
                  ? "Things to do"
                  : tab === "Beach"
                    ? "Beach house rentals"
                    : tab === "Mountains"
                      ? "Cabin rentals"
                      : [
                          "Vacation rentals",
                          "House rentals",
                          "Cottage rentals",
                        ][i % 3]}
              </small>
            </SidLink>
          ))}
        </div>
      </div>
      <div className="footer-columns">
        {Object.entries(columns).map(([title, links]) => (
          <div key={title}>
            <strong>{title}</strong>
            {links.map((label) => (
              <SidLink
                key={label}
                to={"/help?topic=" + label.toLowerCase().replaceAll(" ", "-")}
              >
                {label}
              </SidLink>
            ))}
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Airbnb, Inc.</span>
        {["Terms", "Sitemap", "Privacy", "Your Privacy Choices"].map((t) => (
          <SidLink
            to={"/help?topic=" + t.toLowerCase().replaceAll(" ", "-")}
            key={t}
          >
            · {t}
          </SidLink>
        ))}
        <div className="spacer" />
        <button className="text" onClick={() => setLanguage(true)}>
          <Icon name="Globe" size={16} /> English (US)
        </button>
        <button className="text" onClick={() => setLanguage(true)}>
          $ {state.preferences.currency || "USD"}
        </button>
        <span>f　◎　𝕏</span>
      </div>
      {language && <LanguageModal onClose={() => setLanguage(false)} />}
    </footer>
  );
}
export default function Layout() {
  const loc = useLocation(),
    simple = /^\/(book\/|reviews\/(write|edit))/.test(loc.pathname);
  return (
    <>
      <Header home={loc.pathname === "/"} simple={simple} />
      <Outlet />
      {!simple && !loc.pathname.startsWith("/messages") && <Footer />}
    </>
  );
}
