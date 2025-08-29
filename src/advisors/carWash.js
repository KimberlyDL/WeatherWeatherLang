import { getTimeWindow, maxOf } from "./utils.js";

export function carWashAdvisor(hourlyData, period) {
  const window = getTimeWindow(hourlyData, "next12h"); // Next 12 hours

  const maxRain = maxOf(window.precipitation_probability);

  let status, reason;

  if (maxRain >= 40) {
    status = "Not ideal";
    reason = `Rain likely • 🌧 ${maxRain}%`;
  } else if (maxRain >= 20) {
    status = "Caution";
    reason = `Some rain possible • 🌧 ${maxRain}%`;
  } else {
    status = "Good";
    reason = `Low rain chance • 🌧 ${maxRain}%`;
  }

  return {
    activity: "Car Wash",
    status,
    reason,
    period,
  };
}
