import React, { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getSessionId } from "../utils/dataManager";
export function sidPath(path) {
  const sid = getSessionId();
  if (!sid) return path;
  const [base, hash] = path.split("#");
  const [pathname, query] = base.split("?");
  const p = new URLSearchParams(query || "");
  p.set("sid", sid);
  return pathname + "?" + p + (hash ? "#" + hash : "");
}
export function SidLink({ to, ...props }) {
  return <Link to={sidPath(to)} {...props} />;
}
export function useSidNavigate() {
  const nav = useNavigate();
  return (path, opts) =>
    nav(typeof path === "number" ? path : sidPath(path), opts);
}
export function ScrollTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document
        .getElementById(decodeURIComponent(hash.slice(1)))
        ?.scrollIntoView({ block: "start" });
    } else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
export function Logo() {
  return (
    <SidLink to="/" className="logo" aria-label="Airbnb home">
      <svg viewBox="0 0 32 34" width="32" height="34" aria-hidden="true">
        <path
          d="M16 24c-4-4-6-8-3-10 4-4 10 2 3 10-3 4-7 8-11 5-5-4 0-13 6-24 2-4 8-4 10 0 6 11 11 20 6 24-4 3-8-1-11-5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        />
      </svg>
      <span>airbnb</span>
    </SidLink>
  );
}
export function NotFound() {
  return (
    <main className="page narrow">
      <h1>We can’t seem to find the page you’re looking for</h1>
      <p>Try another home or return to your travel plans.</p>
      <SidLink to="/" className="btn dark">
        Go home
      </SidLink>
    </main>
  );
}
