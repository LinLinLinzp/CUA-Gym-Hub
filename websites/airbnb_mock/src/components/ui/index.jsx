import React, { useState, useEffect, useRef } from "react";
import {
  ArrowUp,
  Bath,
  BedDouble,
  Bell,
  BriefcaseBusiness,
  Building2,
  Calendar as CalendarIcon,
  CalendarPlus,
  CarFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  ContactRound,
  CookingPot,
  CreditCard,
  DoorOpen,
  Ellipsis,
  Eye,
  FileText,
  Flag,
  Flame,
  Gem,
  Globe,
  Grid2X2,
  Heart,
  House,
  ImagePlus,
  Key,
  Languages,
  Map,
  MapPin,
  Medal,
  Menu,
  MessageSquare,
  Minus,
  Mountain,
  PawPrint,
  Plus,
  Sailboat,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  SmilePlus,
  Sparkles,
  SprayCan,
  Star,
  Sun,
  Tag,
  Tractor,
  Trash2,
  TreePine,
  Trees,
  Triangle,
  Tv,
  Umbrella,
  Upload,
  Waves,
  Wheat,
  Wifi,
  X,
} from "lucide-react";
const Icons = {
  ArrowUp,
  Bath,
  BedDouble,
  Bell,
  BriefcaseBusiness,
  Building2,
  Calendar: CalendarIcon,
  CalendarPlus,
  CarFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  ContactRound,
  CookingPot,
  CreditCard,
  DoorOpen,
  Ellipsis,
  Eye,
  FileText,
  Flag,
  Flame,
  Gem,
  Globe,
  Grid2X2,
  Heart,
  House,
  ImagePlus,
  Key,
  Languages,
  Map,
  MapPin,
  Medal,
  Menu,
  MessageSquare,
  Minus,
  Mountain,
  PawPrint,
  Plus,
  Sailboat,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  SmilePlus,
  Sparkles,
  SprayCan,
  Star,
  Sun,
  Tag,
  Tractor,
  Trash2,
  TreePine,
  Trees,
  Triangle,
  Tv,
  Umbrella,
  Upload,
  Waves,
  Wheat,
  Wifi,
  X,
};
import { daysFromNow, ymd, fmtDate } from "../../utils/pricing";
import { withSid } from "../../utils/dataManager";
export function Icon({ name, size = 22, ...props }) {
  const I = Icons[name] || Icons.House;
  return <I size={size} strokeWidth={1.75} {...props} />;
}
export function Button({
  variant = "outline",
  className = "",
  children,
  ...props
}) {
  return (
    <button className={`btn ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Chip({ active, children, ...props }) {
  return (
    <button className={`chip ${active ? "selected" : ""}`} {...props}>
      {children}
    </button>
  );
}
export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={!!checked}
      className={`switch ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span>{checked ? "✓" : ""}</span>
    </button>
  );
}
export function Stepper({ value = 0, onChange, min = 0, max = 16, label }) {
  return (
    <div className="stepper">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Icon name="Minus" size={16} />
      </button>
      <span>{value}</span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Icon name="Plus" size={16} />
      </button>
    </div>
  );
}
export function Avatar({ user, size = 40 }) {
  return user?.avatarUrl ? (
    <img
      className="avatar"
      width={size}
      height={size}
      src={withSid(user.avatarUrl)}
      alt={user.firstName || "Profile"}
    />
  ) : (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: user?.avatarColor || "#6A6A6A",
        fontSize: size * 0.4,
      }}
    >
      {user?.firstName?.[0] || "A"}
    </span>
  );
}
export function Field({
  label,
  error,
  as = "input",
  className = "",
  ...props
}) {
  const C = as;
  return (
    <div className={className}>
      <label className={`field ${error ? "error" : ""}`}>
        <span>{label}</span>
        <C aria-label={label} {...props} />
      </label>
      {error && <div className="error-text">{error}</div>}
    </div>
  );
}
export function Empty({ title, children }) {
  return (
    <div className="empty">
      <Icon name="Search" size={38} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  footer,
  wide = false,
  className = "",
}) {
  const ref = useRef(),
    before = useRef();
  useEffect(() => {
    before.current = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () => [
      ...ref.current.querySelectorAll(
        'button:not(:disabled),input,textarea,select,a[href],[tabindex="0"]',
      ),
    ];
    focusables()[0]?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = focusables(),
          first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      before.current?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""} ${className}`}
      >
        <header>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="X" size={18} />
          </button>
          <strong>{title}</strong>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}
export function Confirm({
  title,
  children,
  onClose,
  onConfirm,
  label = "Delete",
  cancelLabel = "Cancel",
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="text" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="dark" onClick={onConfirm}>
            {label}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
export function Stars({
  value = 0,
  onChange,
  size = 36,
  label = "Overall rating",
}) {
  const [hover, setHover] = useState(0);
  return (
    <div
      className="stars"
      role="group"
      aria-label={label}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${label}: ${n} star${n > 1 ? "s" : ""}`}
          title={["Terrible", "Poor", "Okay", "Good", "Great"][n - 1]}
          aria-pressed={value === n}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <Icon
            name="Star"
            size={size}
            fill={(hover || value) >= n ? "#222" : "none"}
          />
        </button>
      ))}
    </div>
  );
}
export function Guests({ value, onChange, max = 16, allowsPets = true }) {
  const [info, setInfo] = useState(false),
    g = { adults: 0, children: 0, infants: 0, pets: 0, ...value };
  function change(k, n) {
    const next = { ...g, [k]: n };
    if (k !== "adults" && n > 0 && !next.adults) next.adults = 1;
    onChange(next);
  }
  return (
    <div className="guests">
      {[
        ["adults", "Adults", "Ages 13 or above"],
        ["children", "Children", "Ages 2–12"],
        ["infants", "Infants", "Under 2"],
        [
          "pets",
          "Pets",
          allowsPets
            ? "Bringing a service animal?"
            : "This place doesn't allow pets",
        ],
      ].map(([k, label, sub]) => (
        <div className="guest-row" key={k}>
          <div>
            <strong>{label}</strong>
            {k === "pets" && allowsPets ? (
              <button className="text small" onClick={() => setInfo(true)}>
                {sub}
              </button>
            ) : (
              <small>{sub}</small>
            )}
          </div>
          <Stepper
            value={g[k]}
            label={label}
            onChange={(n) => change(k, n)}
            min={k === "adults" && g.children + g.infants + g.pets > 0 ? 1 : 0}
            max={
              k === "adults"
                ? max - g.children
                : k === "children"
                  ? Math.max(0, max - (g.adults || 1))
                  : k === "pets" && !allowsPets
                    ? 0
                    : 5
            }
          />
        </div>
      ))}
      {info && (
        <Modal title="Service animals" onClose={() => setInfo(false)}>
          <p>
            Service animals are working animals that assist people with
            disabilities. They are welcome without a pet fee. Emotional support
            animals may be subject to a host’s pet policy.
          </p>
        </Modal>
      )}
    </div>
  );
}
export function Calendar({
  checkIn,
  checkOut,
  onChange,
  blocked = [],
  minNights = 1,
  initialMonth,
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date(
      (initialMonth || checkIn || daysFromNow(0)).slice(0, 7) + "-01T12:00",
    );
    return isNaN(d) ? new Date() : d;
  });
  const today = daysFromNow(0),
    thisMonth = new Date(today.slice(0, 7) + "-01T12:00");
  const select = (d) => {
    if (!checkIn || checkOut || d <= checkIn)
      onChange({ checkIn: d, checkOut: null });
    else onChange({ checkIn, checkOut: d });
  };
  const months = [0, 1].map(
    (offset) => new Date(month.getFullYear(), month.getMonth() + offset, 1, 12),
  );
  return (
    <div className="calendar">
      <div className="calendar-nav">
        <button
          className="icon-btn"
          aria-label="Previous month"
          disabled={month <= thisMonth}
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))
          }
        >
          <Icon name="ChevronLeft" />
        </button>
        <span>Choose your dates</span>
        <button
          className="icon-btn"
          aria-label="Next month"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))
          }
        >
          <Icon name="ChevronRight" />
        </button>
      </div>
      <div className="months">
        {months.map((m) => {
          const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
          return (
            <div className="month" key={m.toISOString()}>
              <h4>
                {m.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h4>
              <div className="days">
                {"SMTWTFS".split("").map((v, i) => (
                  <span className="weekday" key={i}>
                    {v}
                  </span>
                ))}
                {Array.from({ length: m.getDay() }, (_, i) => (
                  <span key={"e" + i} />
                ))}
                {Array.from({ length: days }, (_, i) => {
                  const d = ymd(
                      new Date(m.getFullYear(), m.getMonth(), i + 1, 12),
                    ),
                    busy = blocked.some((r) => d >= r.start && d < r.end),
                    endAllowed =
                      checkIn &&
                      !checkOut &&
                      d > checkIn &&
                      !blocked.some((r) => checkIn < r.end && d > r.start);
                  return (
                    <button
                      key={d}
                      aria-label={d}
                      aria-pressed={d === checkIn || d === checkOut}
                      disabled={d < today || (busy && !endAllowed)}
                      className={`${busy ? "blocked " : ""}${d === checkIn || d === checkOut ? "endpoint " : ""}${checkIn && checkOut && d > checkIn && d < checkOut ? "inrange" : ""}`}
                      onClick={() => select(d)}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="row between">
        <small>
          Minimum stay is {minNights} night{minNights > 1 ? "s" : ""}
        </small>
        <button
          className="text"
          onClick={() => onChange({ checkIn: null, checkOut: null })}
        >
          Clear dates
        </button>
      </div>
    </div>
  );
}
export function Share({ title, photo, onClose, extra }) {
  const [copied, setCopied] = useState("");
  const copy = async (label) => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(label);
    } catch {
      setCopied("Select the link below to copy");
    }
  };
  return (
    <Modal title="Share this place" onClose={onClose}>
      <div className="row">
        {photo && <img className="thumb" src={photo} alt="" />}
        <strong>{title}</strong>
      </div>
      <div className="share-grid">
        {["Copy link", "Email", "Messages", "WhatsApp", "Facebook", "X"].map(
          (label) => (
            <Button key={label} onClick={() => copy(label)}>
              {copied === label
                ? label === "Copy link"
                  ? "Link copied"
                  : `Copied link for ${label}`
                : label}
            </Button>
          ),
        )}
      </div>
      {copied.startsWith("Select") && (
        <input
          readOnly
          value={window.location.href}
          onFocus={(e) => e.target.select()}
        />
      )}
      {extra}
    </Modal>
  );
}
export function CardForm({ value, onChange, errors = {} }) {
  return (
    <div className="card-form">
      <Field
        label="Card number"
        autoComplete="cc-number"
        inputMode="numeric"
        value={value.number || ""}
        maxLength={23}
        onChange={(e) =>
          onChange({
            ...value,
            number: e.target.value
              .replace(/\D/g, "")
              .slice(0, 19)
              .replace(/(.{4})/g, "$1 ")
              .trim(),
          })
        }
        error={errors.number}
      />
      <div className="two">
        <Field
          label="Expiration (MM/YY)"
          placeholder="MM/YY"
          value={value.exp || ""}
          onChange={(e) => onChange({ ...value, exp: e.target.value })}
          error={errors.exp}
        />
        <Field
          label="CVV"
          autoComplete="cc-csc"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={value.cvv || ""}
          onChange={(e) => onChange({ ...value, cvv: e.target.value })}
          error={errors.cvv}
        />
      </div>
      <Field
        label="ZIP code"
        value={value.zip || ""}
        onChange={(e) => onChange({ ...value, zip: e.target.value })}
        error={errors.zip}
      />
      <Field
        label="Country/region"
        as="select"
        value={value.country || "United States"}
        onChange={(e) => onChange({ ...value, country: e.target.value })}
      >
        {[
          "United States",
          "Canada",
          "United Kingdom",
          "France",
          "Portugal",
          "Mexico",
        ].map((v) => (
          <option key={v}>{v}</option>
        ))}
      </Field>
    </div>
  );
}
export function validateCard(v) {
  const number = (v.number || "").replace(/\D/g, ""),
    digits = [...number].reverse().map(Number),
    sum = digits.reduce((n, d, i) => {
      if (i % 2) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      return n + d;
    }, 0),
    [mm, yy] = (v.exp || "").split("/").map(Number),
    now = new Date(),
    errors = {};
  if (number.length < 13 || number.length > 19 || sum % 10)
    errors.number = "Check your card number";
  if (
    !/^(0[1-9]|1[0-2])\/\d{2}$/.test(v.exp || "") ||
    !mm ||
    mm > 12 ||
    new Date(2000 + yy, mm, 0, 23, 59) < now
  )
    errors.exp = "Check the expiration date";
  if (!/^\d{3,4}$/.test(v.cvv || "")) errors.cvv = "Check your security code";
  if (!v.zip?.trim()) errors.zip = "Required";
  return errors;
}
export const cardRecord = (v) => ({
  type: "card",
  brand: { 4: "Visa", 5: "Mastercard", 3: "Amex" }[v.number?.[0]] || "Card",
  last4: v.number.replace(/\D/g, "").slice(-4),
  expMonth: Number(v.exp.split("/")[0]),
  expYear: 2000 + Number(v.exp.split("/")[1]),
  holderName: "Emily Carter",
  billingZip: v.zip,
});
