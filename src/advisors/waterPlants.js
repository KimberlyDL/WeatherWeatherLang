import { getTimeWindow, maxOf, avgOf, medianOf } from "./utils.js";

export function waterPlantsAdvisor(hourlyData, dailyData, period) {
  const window = getTimeWindow(hourlyData, "next24h"); // Next 24 hours

  const maxRain = maxOf(window.precipitation_probability);
  const avgTemp = avgOf(window.temperature_2m);
  const rhMed = medianOf(window.relative_humidity_2m);

  let status, reason;

  if (maxRain >= 50) {
    status = "Good";
    reason = `Rain expected • 🌧 ${maxRain}% - no watering needed`;
  } else if (avgTemp >= 32 && rhMed <= 70) {
    status = "Not ideal";
    reason = `Hot & dry • 🌡 ${Math.round(avgTemp)}°C • 💧 ${Math.round(
      rhMed
    )}% - water needed`;
  } else {
    status = "Caution";
    reason = `Light watering • 🌡 ${Math.round(avgTemp)}°C • 💧 ${Math.round(
      rhMed
    )}%`;
  }

  return {
    activity: "Water Plants",
    status,
    reason,
    period,
  };
}
