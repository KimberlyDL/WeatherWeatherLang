import { retry, withTimeoutOrMock } from "../utils/async.js";

const BASE_URLS = {
  geocoding: "https://geocoding-api.open-meteo.com/v1",
  weather: "https://api.open-meteo.com/v1",
  airQuality: "https://air-quality-api.open-meteo.com/v1",
  climate: "https://climate-api.open-meteo.com/v1",
};

export async function geocodeCity(query) {
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

  return retry(
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
}

export async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
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
}

export async function reverseGeocode(latitude, longitude) {
  const url = `${BASE_URLS.geocoding}/search?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`;

  const mockData = [
    {
      name: "Current Location",
      country: "Unknown Country",
      admin1: "Unknown State",
      latitude: latitude,
      longitude: longitude,
      country_code: "XX",
    },
  ];

  return retry(
    async () => {
      return withTimeoutOrMock(
        fetch(url)
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
          })
          .then((data) => {
            if (data.results && data.results.length > 0) {
              const result = data.results[0];
              return {
                name: result.name,
                country: result.country,
                country_code: result.country_code,
                admin1: result.admin1,
                admin2: result.admin2,
                latitude: result.latitude,
                longitude: result.longitude,
                timezone: result.timezone,
              };
            }
            return mockData[0];
          }),
        mockData[0],
        3000
      );
    },
    { retries: 3, baseDelay: 400 }
  );
}

export async function getHourlyWeather(
  latitude,
  longitude,
  startDate,
  endDate
) {
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

  return retry(
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
}

export async function getDailyWeather(latitude, longitude, forecastDays = 16) {
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
      precipitation_probability_max: Array.from({ length: forecastDays }, () =>
        Math.round(Math.random() * 100)
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

  return retry(
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
}

export async function getAQI(latitude, longitude, startDate, endDate) {
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

  return retry(
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
}

export async function getClimate(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,shortwave_radiation_sum",
    start_date: "1991-01-01",
    end_date: "2020-12-31",
    models: "EC_Earth3P_HR",
  });

  const url = `${BASE_URLS.climate}/climate?${params}`;

  const mockData = {
    daily: {
      temperature_2m_max: [25, 28, 22, 18],
      temperature_2m_min: [15, 18, 12, 8],
      precipitation_sum: [45, 32, 67, 89],
      shortwave_radiation_sum: [15000, 18000, 12000, 8000],
    },
  };

  return retry(
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
}
