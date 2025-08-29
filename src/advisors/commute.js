import { getTimeWindow, maxOf } from "./utils.js";

export function commuteAdvisor(hourlyData, period) {
  const window = getTimeWindow(hourlyData, period);

  const maxWind = maxOf(window.wind_speed_10m);
  const maxRain = maxOf(window.precipitation_probability);

  let status, reason;

  if (maxWind >= 35) {
    status = "Not ideal";
    reason = `Strong winds • 💨 ${Math.round(
      maxWind
    )} km/h - delay if possible`;
  } else if (maxRain >= 50) {
    status = "Caution";
    reason = `Rain gear advised • 🌧 ${maxRain}%`;
  } else {
    status = "Good";
    reason = `Normal conditions • 💨 ${Math.round(
      maxWind
    )} km/h • 🌧 ${maxRain}%`;
  }

  return {
    activity: "Commute/Motorcycle",
    status,
    reason,
    period,
  };
}
