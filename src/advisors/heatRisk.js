import { getTimeWindow, maxOf, avgOf } from "./utils.js";

export function heatRiskAdvisor(hourlyData, period) {
  const window = getTimeWindow(hourlyData, period);

  const maxTemp = maxOf(window.temperature_2m);
  const avgHumidity = avgOf(window.relative_humidity_2m);

  let status, reason;

  if (maxTemp >= 35 || (maxTemp >= 32 && avgHumidity >= 65)) {
    status = "Not ideal";
    reason = `Heat caution • 🌡 ${Math.round(maxTemp)}°C • 💧 ${Math.round(
      avgHumidity
    )}%`;
  } else if (maxTemp >= 30) {
    status = "Caution";
    reason = `Warm conditions • 🌡 ${Math.round(maxTemp)}°C`;
  } else {
    status = "Good";
    reason = `Comfortable • 🌡 ${Math.round(maxTemp)}°C`;
  }

  return {
    activity: "Heat Risk / AC",
    status,
    reason,
    period,
  };
}
