import { dateKey, plusDays } from "./format.js";
export function nextSprintStart(endDate, settings = {}) {
  const first = plusDays(endDate || dateKey(), 1),
    days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ],
    target = Math.max(0, days.indexOf(settings.startDay || "monday")),
    current = new Date(first + "T12:00").getDay();
  return plusDays(first, (target - current + 7) % 7);
}
