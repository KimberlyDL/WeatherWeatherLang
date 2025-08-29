import { getTimeWindow, maxOf, hoursMeeting } from "./utils.js";

export function secureItemsAdvisor(hourlyData, period) {
  const window = getTimeWindow(hourlyData, period);

  const maxWind = maxOf(window.wind_speed_10m);
  const consecutiveRainHours = hoursMeeting(
    window.precipitation_probability,
    (prob) => prob >= 70
  );

  let status, reason;

  if (maxWind >= 35 || consecutiveRainHours >= 3) {
    status = "Not ideal";
    reason = `Secure items now • 💨 ${Math.round(maxWind)} km/h`;
  } else if (maxWind >= 25) {
    status = "Caution";
    reason = `Gusty later • 💨 ${Math.round(maxWind)} km/h`;
  } else {
    status = "Good";
    reason = `All good • 💨 ${Math.round(maxWind)} km/h`;
  }

  return {
    activity: "Secure Loose Items",
    status,
    reason,
    period,
  };
}
