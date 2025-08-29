import { getTimeWindow, maxOf, avgOf, medianOf } from "./utils.js";

export function laundryAdvisor(hourlyData, period) {
  const window = getTimeWindow(hourlyData, period);

  const maxRain = maxOf(window.precipitation_probability) / 100;
  const rhMed = medianOf(window.relative_humidity_2m) / 100;
  const windNorm = Math.min(avgOf(window.wind_speed_10m) / 30, 1);

  const score = 0.6 * (1 - maxRain) + 0.25 * (1 - rhMed) + 0.15 * windNorm;
  const scorePercent = score * 100;

  let status, reason;
  if (scorePercent >= 70) {
    status = "Good";
    reason = `Ideal conditions • 🌧 ${Math.round(
      maxRain * 100
    )}% • 💧 ${Math.round(rhMed * 100)}% • 💨 ${Math.round(
      avgOf(window.wind_speed_10m)
    )} km/h`;
  } else if (scorePercent >= 45) {
    status = "Caution";
    reason = `Fair conditions • 🌧 ${Math.round(
      maxRain * 100
    )}% • 💧 ${Math.round(rhMed * 100)}% • 💨 ${Math.round(
      avgOf(window.wind_speed_10m)
    )} km/h`;
  } else {
    status = "Not ideal";
    reason = `Poor conditions • 🌧 ${Math.round(
      maxRain * 100
    )}% • 💧 ${Math.round(rhMed * 100)}% • 💨 ${Math.round(
      avgOf(window.wind_speed_10m)
    )} km/h`;
  }

  return {
    activity: "Laundry",
    status,
    reason,
    period,
  };
}
