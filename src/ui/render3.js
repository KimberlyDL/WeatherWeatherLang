import { formatTime, formatDate, formatDateLong } from "../utils/ui.js";
import {
  getWeatherIcon,
  getWeatherDescription,
  getAQICategory,
  getDominantPollutant,
} from "../utils/mappers.js";

export function renderHourlyData(hourlyData, aqiData, selectedDate) {
  const container = document.getElementById("hourlyData");

  if (!hourlyData || !hourlyData.time) {
    container.innerHTML =
      '<div class="text-center py-8 text-gray-500">No hourly data available</div>';
    return;
  }

  const html = hourlyData.time
    .map((time, index) => {
      const temp = Math.round(hourlyData.temperature_2m[index]);
      const precipProb = hourlyData.precipitation_probability[index];
      const precipMm = hourlyData.precipitation[index];
      const cloudCover = hourlyData.cloud_cover[index];
      const windSpeed = Math.round(hourlyData.wind_speed_10m[index]);
      const weatherCode = hourlyData.weather_code[index];
      const icon = getWeatherIcon(weatherCode);

      let aqiBadge = "";
      if (aqiData && aqiData.us_aqi && aqiData.us_aqi[index] !== undefined) {
        const aqi = aqiData.us_aqi[index];
        const { category, class: aqiClass } = getAQICategory(aqi);
        const dominantPollutant = getDominantPollutant({
          pm25: aqiData.us_aqi_pm2_5?.[index],
          pm10: aqiData.us_aqi_pm10?.[index],
          ozone: aqiData.us_aqi_ozone?.[index],
          no2: aqiData.us_aqi_nitrogen_dioxide?.[index],
          so2: aqiData.us_aqi_sulphur_dioxide?.[index],
          co: aqiData.us_aqi_carbon_monoxide?.[index],
        });

        aqiBadge = `
                <div class="flex items-center space-x-2">
                    <span class="aqi-badge ${aqiClass}">AQI ${aqi}</span>
                    <span class="text-xs text-gray-500">${dominantPollutant}</span>
                </div>
            `;
      }

      return `
            <div class="hourly-row" onclick="app.showHourDetails(${index})">
                <div class="flex items-center space-x-4">
                    <div class="text-sm font-medium w-16">${formatTime(
                      time
                    )}</div>
                    <div class="weather-icon">${icon}</div>
                    <div class="font-semibold">${temp}°C</div>
                </div>
                <div class="flex items-center space-x-6 text-sm text-gray-600">
                    <div>🌧 ${precipProb}%</div>
                    <div>💧 ${precipMm}mm</div>
                    <div>☁️ ${cloudCover}%</div>
                    <div>💨 ${windSpeed} km/h</div>
                    ${aqiBadge}
                </div>
            </div>
        `;
    })
    .join("");

  container.innerHTML = html;
}

export function renderDailyData(dailyData) {
  const container = document.getElementById("dailyData");

  if (!dailyData || !dailyData.time) {
    container.innerHTML =
      '<div class="text-center py-8 text-gray-500">No daily data available</div>';
    return;
  }

  const html = dailyData.time
    .map((date, index) => {
      const tempMin = Math.round(dailyData.temperature_2m_min[index]);
      const tempMax = Math.round(dailyData.temperature_2m_max[index]);
      const precipSum = dailyData.precipitation_sum[index];
      const precipProbMax = dailyData.precipitation_probability_max[index];
      const windMax = Math.round(dailyData.wind_speed_10m_max[index]);
      const windGust = Math.round(dailyData.wind_gusts_10m_max[index]);
      const sunshineHours = Math.round(
        dailyData.sunshine_duration[index] / 3600
      );

      const aqiAvailable = index <= 5; // AQI available for first 5-7 days

      return `
            <div class="weather-card" onclick="app.showDayDetails(${index})">
                <div class="mb-3">
                    <div class="font-semibold">${formatDate(date)}</div>
                    <div class="text-sm text-gray-500">${
                      formatDateLong(date).split(",")[0]
                    }</div>
                </div>
                
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span>Temperature</span>
                        <span class="font-medium">${tempMin}° - ${tempMax}°C</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Precipitation</span>
                        <span>${precipSum}mm (${precipProbMax}%)</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Wind</span>
                        <span>${windMax}/${windGust} km/h</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Sunshine</span>
                        <span>${sunshineHours}h</span>
                    </div>
                    ${
                      aqiAvailable
                        ? '<div class="mt-2"><span class="aqi-badge aqi-good">AQI Available</span></div>'
                        : ""
                    }
                </div>
            </div>
        `;
    })
    .join("");

  container.innerHTML = html;
}

export function renderAdvisors(advisors) {
  const todayContainer = document.getElementById("todayAdvisors");
  const tomorrowContainer = document.getElementById("tomorrowAdvisors");

  const todayAdvisors = advisors.filter(
    (advisor) => advisor.period === "today"
  );
  const tomorrowAdvisors = advisors.filter(
    (advisor) => advisor.period === "tomorrow"
  );

  todayContainer.innerHTML = todayAdvisors.map(renderAdvisorCard).join("");
  tomorrowContainer.innerHTML = tomorrowAdvisors
    .map(renderAdvisorCard)
    .join("");
}

function renderAdvisorCard(advisor) {
  const statusEmoji = {
    Good: "✅",
    Caution: "⚠️",
    "Not ideal": "❌",
  };

  const statusClass = {
    Good: "advisor-good",
    Caution: "advisor-caution",
    "Not ideal": "advisor-not-ideal",
  };

  return `
        <div class="advisor-card ${statusClass[advisor.status]}">
            <div class="flex items-center space-x-3 mb-2">
                <span class="text-2xl">${statusEmoji[advisor.status]}</span>
                <div>
                    <div class="font-semibold">${advisor.activity}</div>
                    <div class="text-sm font-medium text-gray-600">${
                      advisor.status
                    }</div>
                </div>
            </div>
            <div class="text-sm text-gray-600">${advisor.reason}</div>
        </div>
    `;
}

export function renderHourDetails(hourData, aqiData) {
  const container = document.getElementById("hourDrawerContent");

  const icon = getWeatherIcon(hourData.weatherCode);
  const description = getWeatherDescription(hourData.weatherCode);

  let aqiSection = "";
  if (aqiData && aqiData.aqi !== undefined) {
    const { category, class: aqiClass } = getAQICategory(aqiData.aqi);
    const dominantPollutant = getDominantPollutant(aqiData);

    aqiSection = `
            <div class="border-t pt-4 mt-4">
                <h4 class="font-semibold mb-3">Air Quality</h4>
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span>US AQI</span>
                        <span class="aqi-badge ${aqiClass}">${
      aqiData.aqi
    } - ${category}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span>Dominant Pollutant</span>
                        <span class="font-medium">${dominantPollutant}</span>
                    </div>
                    <div class="mt-3 text-xs text-gray-500">
                        <div class="grid grid-cols-2 gap-2">
                            ${
                              aqiData.pm25
                                ? `<div>PM2.5: ${aqiData.pm25}</div>`
                                : ""
                            }
                            ${
                              aqiData.pm10
                                ? `<div>PM10: ${aqiData.pm10}</div>`
                                : ""
                            }
                            ${
                              aqiData.ozone
                                ? `<div>O₃: ${aqiData.ozone}</div>`
                                : ""
                            }
                            ${
                              aqiData.no2
                                ? `<div>NO₂: ${aqiData.no2}</div>`
                                : ""
                            }
                            ${
                              aqiData.so2
                                ? `<div>SO₂: ${aqiData.so2}</div>`
                                : ""
                            }
                            ${aqiData.co ? `<div>CO: ${aqiData.co}</div>` : ""}
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  container.innerHTML = `
        <div class="space-y-4">
            <div class="text-center">
                <div class="text-4xl mb-2">${icon}</div>
                <div class="text-lg font-semibold">${formatTime(
                  hourData.time
                )}</div>
                <div class="text-sm text-gray-600">${description}</div>
            </div>
            
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <span>Temperature</span>
                    <span class="font-semibold">${Math.round(
                      hourData.temperature
                    )}°C</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Humidity</span>
                    <span>${hourData.humidity}%</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Wind Speed</span>
                    <span>${Math.round(hourData.windSpeed)} km/h</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Precipitation</span>
                    <span>${hourData.precipitation}mm (${
    hourData.precipitationProb
  }%)</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Cloud Cover</span>
                    <span>${hourData.cloudCover}%</span>
                </div>
            </div>
            
            ${aqiSection}
        </div>
    `;
}

export function renderDayDetails(dayData, aqiData) {
  const container = document.getElementById("dayDrawerContent");

  let aqiSection = "";
  if (aqiData && aqiData.maxAqi !== undefined) {
    const { category, class: aqiClass } = getAQICategory(aqiData.maxAqi);
    const dominantPollutant = getDominantPollutant(aqiData);

    aqiSection = `
            <div class="border-t pt-4 mt-4">
                <h4 class="font-semibold mb-3">Air Quality (Peak)</h4>
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span>Max US AQI</span>
                        <span class="aqi-badge ${aqiClass}">${aqiData.maxAqi} - ${category}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span>Dominant Pollutant</span>
                        <span class="font-medium">${dominantPollutant}</span>
                    </div>
                </div>
            </div>
        `;
  }

  container.innerHTML = `
        <div class="space-y-4">
            <div class="text-center">
                <div class="text-lg font-semibold">${formatDateLong(
                  dayData.date
                )}</div>
            </div>
            
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <span>Temperature Range</span>
                    <span class="font-semibold">${Math.round(
                      dayData.tempMin
                    )}° - ${Math.round(dayData.tempMax)}°C</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Precipitation</span>
                    <span>${dayData.precipitationSum}mm (${
    dayData.precipitationProbMax
  }% max)</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Wind</span>
                    <span>${Math.round(
                      dayData.windSpeedMax
                    )} km/h (gusts ${Math.round(dayData.windGustMax)})</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Sunshine</span>
                    <span>${Math.round(
                      dayData.sunshineDuration / 3600
                    )} hours</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Sunrise</span>
                    <span>${formatTime(dayData.sunrise)}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Sunset</span>
                    <span>${formatTime(dayData.sunset)}</span>
                </div>
            </div>
            
            ${aqiSection}
        </div>
    `;
}

export function renderClimateData(climateData, month) {
  const container = document.getElementById("climateData");

  if (!climateData) {
    container.innerHTML =
      '<div class="text-center text-gray-500">No climate data available</div>';
    return;
  }

  const avgTempMax = Math.round(
    climateData.temperature_2m_max.reduce((a, b) => a + b, 0) /
      climateData.temperature_2m_max.length
  );
  const avgTempMin = Math.round(
    climateData.temperature_2m_min.reduce((a, b) => a + b, 0) /
      climateData.temperature_2m_min.length
  );
  const totalPrecip = Math.round(
    climateData.precipitation_sum.reduce((a, b) => a + b, 0)
  );
  const avgSunshine = Math.round(
    climateData.shortwave_radiation_sum.reduce((a, b) => a + b, 0) /
      climateData.shortwave_radiation_sum.length /
      1000
  );

  container.innerHTML = `
        <div class="space-y-3">
            <h4 class="font-medium">Typical for ${month}</h4>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span>Temperature Range</span>
                    <span>${avgTempMin}° - ${avgTempMax}°C</span>
                </div>
                <div class="flex justify-between">
                    <span>Monthly Rain</span>
                    <span>${totalPrecip}mm</span>
                </div>
                <div class="flex justify-between">
                    <span>Daily Sunshine</span>
                    <span>${avgSunshine}h avg</span>
                </div>
            </div>
        </div>
    `;
}
