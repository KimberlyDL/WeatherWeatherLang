export function getWeatherIcon(weatherCode) {
  const iconMap = {
    0: "☀️", // Clear sky
    1: "🌤️", // Mainly clear
    2: "⛅", // Partly cloudy
    3: "☁️", // Overcast
    45: "🌫️", // Fog
    48: "🌫️", // Depositing rime fog
    51: "🌦️", // Light drizzle
    53: "🌦️", // Moderate drizzle
    55: "🌦️", // Dense drizzle
    61: "🌧️", // Slight rain
    63: "🌧️", // Moderate rain
    65: "🌧️", // Heavy rain
    71: "🌨️", // Slight snow
    73: "🌨️", // Moderate snow
    75: "🌨️", // Heavy snow
    77: "❄️", // Snow grains
    80: "🌦️", // Slight rain showers
    81: "🌧️", // Moderate rain showers
    82: "⛈️", // Violent rain showers
    85: "🌨️", // Slight snow showers
    86: "🌨️", // Heavy snow showers
    95: "⛈️", // Thunderstorm
    96: "⛈️", // Thunderstorm with slight hail
    99: "⛈️", // Thunderstorm with heavy hail
  };

  return iconMap[weatherCode] || "🌤️";
}

export function getWeatherDescription(weatherCode) {
  const descriptionMap = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };

  return descriptionMap[weatherCode] || "Unknown";
}

export function getAQICategory(aqi) {
  if (aqi <= 50) return { category: "Good", class: "aqi-good" };
  if (aqi <= 100) return { category: "Moderate", class: "aqi-moderate" };
  if (aqi <= 150) return { category: "USG", class: "aqi-usg" };
  if (aqi <= 200) return { category: "Unhealthy", class: "aqi-unhealthy" };
  if (aqi <= 300)
    return { category: "Very Unhealthy", class: "aqi-very-unhealthy" };
  return { category: "Hazardous", class: "aqi-hazardous" };
}

export function getDominantPollutant(aqiData) {
  if (!aqiData) return null;

  const pollutants = {
    "PM2.5": aqiData.pm25 || 0,
    PM10: aqiData.pm10 || 0,
    "O₃": aqiData.ozone || 0,
    "NO₂": aqiData.no2 || 0,
    "SO₂": aqiData.so2 || 0,
    CO: aqiData.co || 0,
  };

  let maxPollutant = "PM2.5";
  let maxValue = 0;

  for (const [pollutant, value] of Object.entries(pollutants)) {
    if (value > maxValue) {
      maxValue = value;
      maxPollutant = pollutant;
    }
  }

  return maxPollutant;
}
