import { useLocation, useNavigate, Link } from "react-router-dom";
import { withSid } from "./dataManager.js";
export const sidPath = (to, search) => {
  const url = new URL(to, "http://clickup.local");
  const sid = new URLSearchParams(search).get("sid");
  if (sid) url.searchParams.set("sid", sid);
  return url.pathname + url.search + url.hash;
};
export function useNav() {
  const nav = useNavigate(),
    loc = useLocation();
  return (to, options) =>
    nav(typeof to === "number" ? to : sidPath(to, loc.search), options);
}
export function SLink({ to, ...props }) {
  const loc = useLocation();
  return <Link to={sidPath(to, loc.search)} {...props} />;
}
export { withSid };
