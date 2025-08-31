import { retry, withTimeoutOrMock } from "../utils/async.js";
import { executionLogger } from "../utils/executionLogger.js";

const BASE_URLS = {
  geocoding: "https://geocoding-api.open-meteo.com/v1",
  weather: "https://api.open-meteo.com/v1",
  airQuality: "https://air-quality-api.open-meteo.com/v1",
  climate: "https://climate-api.open-meteo.com/v1",
};

export async function geocodeCity(query) {
  const operationId = executionLogger.startOperation(
    "Geocoding City",
    `Searching for: ${query}`
  );

  try {
    // Check if query looks like a postal code (numbers only or alphanumeric for international)
    const isPostalCode =
      /^\d{4,6}$/.test(query.trim()) || /^[A-Z0-9]{3,10}$/i.test(query.trim());

    const url = `${BASE_URLS.geocoding}/search?name=${encodeURIComponent(
      query
    )}&count=10&language=en&format=json`;

    const mockData = [
      {
        name: query.includes(",") ? query.split(",")[0].trim() : query,
        country: "Mock Country",
        admin1: "Mock State/Province",
        admin2: "Mock Region",
        latitude: 40.7128,
        longitude: -74.006,
        country_code: "MC",
        timezone: "America/New_York",
      },
    ];

    const result = await retry(
      async () => {
        return withTimeoutOrMock(
          fetch(url)
            .then((response) => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.json();
            })
            .then((data) => {
              // Enhanced result processing to include more location details
              return (data.results || []).map((result) => ({
                name: result.name,
                country: result.country,
                country_code: result.country_code,
                admin1: result.admin1, // State/Province
                admin2: result.admin2, // County/Region
                latitude: result.latitude,
                longitude: result.longitude,
                timezone: result.timezone,
                population: result.population,
                postcodes: result.postcodes,
              }));
            }),
          mockData,
          3000
        );
      },
      { retries: 3, baseDelay: 400 }
    );

    executionLogger.endOperation(operationId);
    return result;
  } catch (error) {
    executionLogger.endOperation(operationId, error);
    throw error;
  }
}

export async function getCurrentLocation() {
  const operationId = executionLogger.startOperation(
    "Getting GPS Location",
    "Requesting device location"
  );

  try {
    const result = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let message = "Unable to retrieve location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location access denied by user";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information unavailable";
              break;
            case error.TIMEOUT:
              message = "Location request timed out";
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });

    executionLogger.endOperation(operationId);
    return result;
  } catch (error) {
    executionLogger.endOperation(operationId, error);
    throw error;
  }
}

// export async function reverseGeocode(latitude, longitude) {
//   const operationId = executionLogger.startOperation(
//     "Reverse Geocoding",
//     `Lat: ${latitude}, Lng: ${longitude}`
//   );

//   try {
//     const url = `${BASE_URLS.geocoding}/search?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`;

//     const mockData = [
//       {
//         name: "Current Location",
//         country: "Unknown Country",
//         admin1: "Unknown State",
//         latitude: latitude,
//         longitude: longitude,
//         country_code: "XX",
//       },
//     ];

//     const result = await retry(
//       async () => {
//         return withTimeoutOrMock(
//           fetch(url)
//             .then((response) => {
//               if (!response.ok) throw new Error(`HTTP ${response.status}`);
//               return response.json();
//             })
//             .then((data) => {
//               if (data.results && data.results.length > 0) {
//                 const result = data.results[0];
//                 return {
//                   name: result.name,
//                   country: result.country,
//                   country_code: result.country_code,
//                   admin1: result.admin1,
//                   admin2: result.admin2,
//                   latitude: result.latitude,
//                   longitude: result.longitude,
//                   timezone: result.timezone,
//                 };
//               }
//               return mockData[0];
//             }),
//           mockData[0],
//           3000
//         );
//       },
//       { retries: 3, baseDelay: 400 }
//     );

//     executionLogger.endOperation(operationId);
//     return result;
//   } catch (error) {
//     executionLogger.endOperation(operationId, error);
//     throw error;
//   }
// }

export async function reverseGeocode(latitude, longitude) {
  const urlOM =
    `${BASE_URLS.geocoding}/reverse?` +
    new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      count: "1",
      language: "en",
    }).toString();

  const mockResult = {
    name: "Current Location",
    admin1: "Unknown State",
    admin2: "Unknown County",
    country: "Unknown Country",
    country_code: "XX",
    latitude,
    longitude,
  };

  // Helper to normalize Open-Meteo payload
  const normalizeOM = (r) => ({
    name: r.name,
    admin1: r.admin1,
    admin2: r.admin2,
    country: r.country,
    country_code: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  });

  // Helper to normalize Nominatim payload
  const normalizeOSM = (j) => {
    const a = j.address || {};
    return {
      name:
        a.city ||
        a.town ||
        a.village ||
        a.municipality ||
        j.display_name?.split(",")[0] ||
        "Current Location",
      admin1: a.state || a.region || null,
      admin2: a.county || null,
      country: a.country || null,
      country_code: (a.country_code || "").toUpperCase() || null,
      latitude,
      longitude,
    };
  };

  // 1) Try Open-Meteo reverse
  try {
    return await retry(
      async () =>
        withTimeoutOrMock(
          fetch(urlOM, { mode: "cors" })
            .then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.json();
            })
            .then((j) => {
              const r = j?.results?.[0];
              if (!r) throw new Error("No reverse-geocoding result");
              return normalizeOM(r);
            }),
          mockResult,
          3000
        ),
      { retries: 3, base: 400 }
    );
  } catch (e) {
    // 2) Fallback: OSM Nominatim (has CORS)
    try {
      const urlOSM =
        `https://nominatim.openstreetmap.org/reverse?` +
        new URLSearchParams({
          lat: String(latitude),
          lon: String(longitude),
          format: "json",
          "accept-language": "en",
        }).toString();

      const j = await fetch(urlOSM, {
        headers: { Accept: "application/json" },
      }).then((r) => {
        if (!r.ok) throw new Error(`OSM HTTP ${r.status}`);
        return r.json();
      });

      return normalizeOSM(j);
    } catch (e2) {
      // 3) Last resort: mock/minimal label so the rest of the app continues
      return mockResult;
    }
  }
}

export async function getHourlyWeather(
  latitude,
  longitude,
  startDate,
  endDate
) {
  const operationId = executionLogger.startOperation(
    "Fetching Hourly Weather",
    `${startDate} to ${endDate}`
  );

  try {
    const params = new URLSearchParams({
      latitude,
      longitude,
      timezone: "auto",
      temperature_unit: "celsius",
      wind_speed_unit: "kmh",
      precipitation_unit: "mm",
      timeformat: "iso8601",
      hourly:
        "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability,precipitation,weather_code,cloud_cover",
      start_date: startDate,
      end_date: endDate,
    });

    const url = `${BASE_URLS.weather}/forecast?${params}`;

    const mockData = {
      hourly: {
        time: Array.from({ length: 24 }, (_, i) => {
          const date = new Date(startDate);
          date.setHours(i);
          return date.toISOString();
        }),
        temperature_2m: Array.from({ length: 24 }, () =>
          Math.round(Math.random() * 30 + 5)
        ),
        relative_humidity_2m: Array.from({ length: 24 }, () =>
          Math.round(Math.random() * 40 + 40)
        ),
        wind_speed_10m: Array.from({ length: 24 }, () =>
          Math.round(Math.random() * 20 + 5)
        ),
        precipitation_probability: Array.from({ length: 24 }, () =>
          Math.round(Math.random() * 100)
        ),
        precipitation: Array.from(
          { length: 24 },
          () => Math.round(Math.random() * 5 * 10) / 10
        ),
        weather_code: Array.from({ length: 24 }, () =>
          Math.floor(Math.random() * 4)
        ),
        cloud_cover: Array.from({ length: 24 }, () =>
          Math.round(Math.random() * 100)
        ),
      },
    };

    const result = await retry(
      async () => {
        return withTimeoutOrMock(
          fetch(url)
            .then((response) => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.json();
            })
            .then((data) => data.hourly),
          mockData.hourly,
          3000
        );
      },
      { retries: 3, baseDelay: 400 }
    );

    executionLogger.endOperation(operationId);
    return result;
  } catch (error) {
    executionLogger.endOperation(operationId, error);
    throw error;
  }
}

export async function getDailyWeather(latitude, longitude, forecastDays = 16) {
  const operationId = executionLogger.startOperation(
    "Fetching Daily Weather",
    `${forecastDays} days forecast`
  );

  try {
    const params = new URLSearchParams({
      latitude,
      longitude,
      timezone: "auto",
      temperature_unit: "celsius",
      wind_speed_unit: "kmh",
      precipitation_unit: "mm",
      timeformat: "iso8601",
      daily:
        "temperature_2m_min,temperature_2m_max,precipitation_sum,sunshine_duration,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset",
      forecast_days: forecastDays,
    });

    const url = `${BASE_URLS.weather}/forecast?${params}`;

    const mockData = {
      daily: {
        time: Array.from({ length: forecastDays }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() + i);
          return date.toISOString().split("T")[0];
        }),
        temperature_2m_min: Array.from({ length: forecastDays }, () =>
          Math.round(Math.random() * 15 + 5)
        ),
        temperature_2m_max: Array.from({ length: forecastDays }, () =>
          Math.round(Math.random() * 15 + 20)
        ),
        precipitation_sum: Array.from(
          { length: forecastDays },
          () => Math.round(Math.random() * 20 * 10) / 10
        ),
        sunshine_duration: Array.from({ length: forecastDays }, () =>
          Math.round(Math.random() * 43200)
        ),
        precipitation_probability_max: Array.from(
          { length: forecastDays },
          () => Math.round(Math.random() * 100)
        ),
        wind_speed_10m_max: Array.from({ length: forecastDays }, () =>
          Math.round(Math.random() * 30 + 10)
        ),
        wind_gusts_10m_max: Array.from({ length: forecastDays }, () =>
          Math.round(Math.random() * 50 + 20)
        ),
        sunrise: Array.from({ length: forecastDays }, () => "2024-01-01T07:00"),
        sunset: Array.from({ length: forecastDays }, () => "2024-01-01T18:00"),
      },
    };

    const result = await retry(
      async () => {
        return withTimeoutOrMock(
          fetch(url)
            .then((response) => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.json();
            })
            .then((data) => data.daily),
          mockData.daily,
          3000
        );
      },
      { retries: 3, baseDelay: 400 }
    );

    executionLogger.endOperation(operationId);
    return result;
  } catch (error) {
    executionLogger.endOperation(operationId, error);
    throw error;
  }
}

export async function getAQI(latitude, longitude, startDate, endDate) {
  const operationId = executionLogger.startOperation(
    "Fetching Air Quality Data",
    `${startDate} to ${endDate}`
  );

  try {
    const params = new URLSearchParams({
      latitude,
      longitude,
      timezone: "auto",
      timeformat: "iso8601",
      hourly:
        "us_aqi,us_aqi_pm2_5,us_aqi_pm10,us_aqi_ozone,us_aqi_nitrogen_dioxide,us_aqi_sulphur_dioxide,us_aqi_carbon_monoxide",
      start_date: startDate,
      end_date: endDate,
    });

    const url = `${BASE_URLS.airQuality}/air-quality?${params}`;

    const mockData = {
      hourly: {
        time: Array.from({ length: 24 }, (_, i) => {
          const date = new Date(startDate);
          date.setHours(i);
          return date.toISOString();
        }),
        us_aqi: Array.from({ length: 24 }, () =>
          Math.round(Math.random() * 150 + 20)
        ),
        us_aqi_pm2_5: Array.from({ length: 24 }, () =>
          Math.round(Math.random() * 100 + 10)
        ),
        us_aqi_pm10: Array.from({ length: 24 }, () =>
          Math.round(Math.random() * 80 + 15)
        ),
        us_aqi_ozone: Array.from({ length: 24 }, () =>
          Math.round(Math.random() * 120 + 20)
        ),
        us_aqi_nitrogen_dioxide: Array.from({ length: 24 }, () =>
          Math.round(Math.random() * 60 + 10)
        ),
        us_aqi_sulphur_dioxide: Array.from({ length: 24 }, () =>
          Math.round(Math.random() * 40 + 5)
        ),
        us_aqi_carbon_monoxide: Array.from({ length: 24 }, () =>
          Math.round(Math.random() * 30 + 5)
        ),
      },
    };

    const result = await retry(
      async () => {
        return withTimeoutOrMock(
          fetch(url)
            .then((response) => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.json();
            })
            .then((data) => data.hourly),
          mockData.hourly,
          3000
        );
      },
      { retries: 3, baseDelay: 400 }
    );

    executionLogger.endOperation(operationId);
    return result;
  } catch (error) {
    executionLogger.endOperation(operationId, error);
    throw error;
  }
}

// export async function getClimate(latitude, longitude) {
//   const operationId = executionLogger.startOperation(
//     "Fetching Climate Data",
//     "Historical averages (1991-2020)"
//   );

//   try {
//     const params = new URLSearchParams({
//       latitude,
//       longitude,
//       monthly:
//         "temperature_2m_max,temperature_2m_min,precipitation_sum,shortwave_radiation_sum",
//       start_date: "1991-01-01",
//       end_date: "2020-12-31",
//     });

//     const url = `${BASE_URLS.climate}/climate?${params}`;

//     const mockData = {
//       monthly: {
//         time: [
//           "1991-01-01",
//           "1991-02-01",
//           "1991-03-01",
//           "1991-04-01",
//           "1991-05-01",
//           "1991-06-01",
//           "1991-07-01",
//           "1991-08-01",
//           "1991-09-01",
//           "1991-10-01",
//           "1991-11-01",
//           "1991-12-01",
//         ],
//         temperature_2m_max: Array.from({ length: 12 }, (_, i) =>
//           Math.round(Math.random() * 20 + 15 + Math.sin((i * Math.PI) / 6) * 10)
//         ),
//         temperature_2m_min: Array.from({ length: 12 }, (_, i) =>
//           Math.round(Math.random() * 15 + 5 + Math.sin((i * Math.PI) / 6) * 8)
//         ),
//         precipitation_sum: Array.from({ length: 12 }, () =>
//           Math.round(Math.random() * 100 + 20)
//         ),
//         shortwave_radiation_sum: Array.from({ length: 12 }, (_, i) =>
//           Math.round(
//             Math.random() * 5000 + 8000 + Math.sin((i * Math.PI) / 6) * 3000
//           )
//         ),
//       },
//     };

//     const result = await retry(
//       async () => {
//         return withTimeoutOrMock(
//           fetch(url)
//             .then((response) => {
//               if (!response.ok) throw new Error(`HTTP ${response.status}`);
//               return response.json();
//             })
//             .then((data) => data.monthly || data.daily), // Handle both monthly and daily responses
//           mockData.monthly,
//           3000
//         );
//       },
//       { retries: 3, baseDelay: 400 }
//     );

//     executionLogger.endOperation(operationId);
//     return result;
//   } catch (error) {
//     executionLogger.endOperation(operationId, error);
//     throw error;
//   }
// }

export async function getClimate(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,shortwave_radiation_sum",
    start_date: "1991-01-01",
    end_date: "2020-12-31",
    models: "EC_Earth3P_HR",
    timezone: "auto",
  });

  const url = `${BASE_URLS.climate}/climate?${params}`;

  try {
    const data = await retry(
      async () => {
        return withTimeoutOrMock(
          fetch(url)
            .then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.json();
            })
            .then((json) => json?.daily || null),
          // mock: 12 months with plausible numbers
          {
            temperature_2m_max: Array.from(
              { length: 12 },
              () => 31 + Math.random() * 4
            ),
            temperature_2m_min: Array.from(
              { length: 12 },
              () => 23 + Math.random() * 4
            ),
            precipitation_sum: Array.from(
              { length: 12 },
              () => 50 + Math.random() * 200
            ),
            shortwave_radiation_sum: Array.from(
              { length: 12 },
              () => 12000 + Math.random() * 8000
            ),
          },
          3000
        );
      },
      { retries: 3, base: 400 } // keep your retry style
    );

    if (!data) return null;

    // Normalize fields so the renderer can consume safely
    return {
      temperature_2m_max: Array.isArray(data.temperature_2m_max)
        ? data.temperature_2m_max
        : [],
      temperature_2m_min: Array.isArray(data.temperature_2m_min)
        ? data.temperature_2m_min
        : [],
      precipitation_sum: Array.isArray(data.precipitation_sum)
        ? data.precipitation_sum
        : [],
      shortwave_radiation_sum: Array.isArray(data.shortwave_radiation_sum)
        ? data.shortwave_radiation_sum
        : [],
    };
  } catch (e) {
    console.warn("[climate] falling back to forecast averages:", e);
    return null; // let the caller decide fallback
  }
}
