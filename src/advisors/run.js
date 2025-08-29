import { getTimeWindow, maxOf, avgOf } from "./utils.js"

export function runAdvisor(hourlyData, period) {
  const window = getTimeWindow(hourlyData, period)

  const maxRain = maxOf(window.precipitation_probability)
  const avgTemp = avgOf(window.temperature_2m)
  const avgHumidity = avgOf(window.relative_humidity_2m)

  let status, reason

  if (maxRain >= 50) {
    status = "Not ideal"
    reason = `High rain chance • 🌧 ${maxRain}%`
  } else if (avgTemp >= 35 || (avgTemp >= 32 && avgHumidity >= 65)) {
    status = "Caution"
    reason = `Heat risk • 🌡 ${Math.round(avgTemp)}°C • 💧 ${Math.round(avgHumidity)}%`
  } else {
    status = "Good"
    reason = `Good conditions • 🌡 ${Math.round(avgTemp)}°C • 🌧 ${maxRain}%`
  }

  return {
    activity: "Running",
    status,
    reason,
    period,
  }
}
