import {
  geocodeCity,
  getCurrentLocation,
  reverseGeocode,
  getHourlyWeather,
  getDailyWeather,
  getAQI,
} from "./api/openMeteo.js";
import {
  renderHourlyData,
  renderDailyData,
  renderAdvisors,
  renderHourDetails,
  renderDayDetails,
} from "./ui/render.js";
import { calculateAdvisors } from "./advisors/index.js";
import { showError } from "./utils/ui.js";

class WeatherApp {
  constructor() {
    this.currentCity = null;
    this.currentDate = new Date().toISOString().split("T")[0];
    this.weatherData = {};
    this.aqiData = {};

    this.initializeApp();
  }

  initializeApp() {
    this.setupEventListeners();
    this.setDefaultDate();
    this.loadDefaultCity();
  }

  setupEventListeners() {
    // Tab switching
    document
      .getElementById("hourlyTab")
      .addEventListener("click", () => this.switchTab("hourly"));
    document
      .getElementById("dailyTab")
      .addEventListener("click", () => this.switchTab("daily"));
    document
      .getElementById("advisorsTab")
      .addEventListener("click", () => this.switchTab("advisors"));

    // City search
    const cityInput = document.getElementById("cityInput");
    cityInput.addEventListener(
      "input",
      this.debounce(this.handleCitySearch.bind(this), 300)
    );
    cityInput.addEventListener("blur", () => {
      setTimeout(
        () => document.getElementById("cityResults").classList.add("hidden"),
        200
      );
    });

    document
      .getElementById("useLocationBtn")
      .addEventListener("click", this.handleUseCurrentLocation.bind(this));

    // Date change
    document
      .getElementById("dateInput")
      .addEventListener("change", this.handleDateChange.bind(this));

    // Drawer controls
    document
      .getElementById("closeHourDrawer")
      .addEventListener("click", () => this.closeDrawer("hourDrawer"));
    document
      .getElementById("closeDayDrawer")
      .addEventListener("click", () => this.closeDrawer("dayDrawer"));
    document
      .getElementById("closeSidebar")
      .addEventListener("click", () => this.closeSidebar());
  }

  setDefaultDate() {
    document.getElementById("dateInput").value = this.currentDate;
  }

  async loadDefaultCity() {
    try {
      // Default to New York
      const cities = await geocodeCity("New York");
      if (cities.length > 0) {
        this.currentCity = cities[0];
        document.getElementById("cityInput").value = this.currentCity.name;
        await this.loadWeatherData();
      }
    } catch (error) {
      showError("Failed to load default city");
    }
  }

  async handleCitySearch(event) {
    const query = event.target.value.trim();
    if (query.length < 2) {
      document.getElementById("cityResults").classList.add("hidden");
      return;
    }

    try {
      const cities = await geocodeCity(query);
      this.renderCityResults(cities);
    } catch (error) {
      console.error("City search failed:", error);
    }
  }

  renderCityResults(cities) {
    const resultsDiv = document.getElementById("cityResults");

    if (cities.length === 0) {
      resultsDiv.classList.add("hidden");
      return;
    }

    resultsDiv.innerHTML = cities
      .map((city) => {
        // Build detailed location string
        const locationParts = [city.name];
        if (city.admin1) locationParts.push(city.admin1);
        if (city.admin2 && city.admin2 !== city.admin1)
          locationParts.push(city.admin2);
        locationParts.push(city.country);

        const locationString = locationParts.join(", ");
        const populationText = city.population
          ? ` • ${city.population.toLocaleString()} people`
          : "";

        return `
            <div class="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0" 
                 onclick="app.selectCity(${JSON.stringify(city).replace(
                   /"/g,
                   "&quot;"
                 )})">
                <div class="font-medium">${city.name}</div>
                <div class="text-sm text-gray-500">${locationString}${populationText}</div>
                ${
                  city.postcodes
                    ? `<div class="text-xs text-gray-400">Postal: ${city.postcodes.join(
                        ", "
                      )}</div>`
                    : ""
                }
            </div>
          `;
      })
      .join("");

    resultsDiv.classList.remove("hidden");
  }

  async selectCity(city) {
    this.currentCity = city;

    // Create a more detailed display name
    let displayName = city.name;
    if (city.admin1 && city.admin1 !== city.name) {
      displayName += `, ${city.admin1}`;
    }
    if (city.country_code) {
      displayName += ` (${city.country_code})`;
    }

    document.getElementById("cityInput").value = displayName;
    document.getElementById("cityResults").classList.add("hidden");
    await this.loadWeatherData();
  }

  async handleDateChange(event) {
    this.currentDate = event.target.value;
    if (this.currentCity) {
      await this.loadWeatherData();
    }
  }

  async loadWeatherData() {
    if (!this.currentCity) return;

    const { latitude, longitude } = this.currentCity;

    try {
      // Load data based on current tab
      const activeTab = document.querySelector(".tab-button.active").id;

      if (activeTab === "hourlyTab") {
        await this.loadHourlyData(latitude, longitude);
      } else if (activeTab === "dailyTab") {
        await this.loadDailyData(latitude, longitude);
      } else if (activeTab === "advisorsTab") {
        await this.loadAdvisorsData(latitude, longitude);
      }
    } catch (error) {
      showError("Failed to load weather data");
      console.error("Weather data loading failed:", error);
    }
  }

  async loadHourlyData(latitude, longitude) {
    this.showLoading("hourlyLoading");

    try {
      const [hourlyData, aqiData] = await Promise.all([
        getHourlyWeather(
          latitude,
          longitude,
          this.currentDate,
          this.currentDate
        ),
        getAQI(latitude, longitude, this.currentDate, this.currentDate).catch(
          () => null
        ),
      ]);

      this.weatherData.hourly = hourlyData;
      this.aqiData.hourly = aqiData;

      renderHourlyData(hourlyData, aqiData, this.currentDate);
    } finally {
      this.hideLoading("hourlyLoading");
    }
  }

  async loadDailyData(latitude, longitude) {
    this.showLoading("dailyLoading");

    try {
      const dailyData = await getDailyWeather(latitude, longitude, 16);
      this.weatherData.daily = dailyData;

      renderDailyData(dailyData);
    } finally {
      this.hideLoading("dailyLoading");
    }
  }

  async loadAdvisorsData(latitude, longitude) {
    this.showLoading("advisorsLoading");

    try {
      // Load 48 hours of data for advisors
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 2);

      const [hourlyData, dailyData] = await Promise.all([
        getHourlyWeather(
          latitude,
          longitude,
          this.currentDate,
          endDate.toISOString().split("T")[0]
        ),
        getDailyWeather(latitude, longitude, 2),
      ]);

      this.weatherData.hourly = hourlyData;
      this.weatherData.daily = dailyData;

      const advisors = calculateAdvisors(hourlyData, dailyData);
      renderAdvisors(advisors);
    } finally {
      this.hideLoading("advisorsLoading");
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    document
      .querySelectorAll(".tab-button")
      .forEach((btn) => btn.classList.remove("active"));
    document.getElementById(`${tabName}Tab`).classList.add("active");

    // Update tab content
    document
      .querySelectorAll(".tab-content")
      .forEach((content) => content.classList.add("hidden"));
    document.getElementById(`${tabName}Content`).classList.remove("hidden");

    // Load data for the new tab
    if (this.currentCity) {
      this.loadWeatherData();
    }
  }

  showHourDetails(hourIndex) {
    if (!this.weatherData.hourly) return;

    const hourData = {
      time: this.weatherData.hourly.time[hourIndex],
      temperature: this.weatherData.hourly.temperature_2m[hourIndex],
      humidity: this.weatherData.hourly.relative_humidity_2m[hourIndex],
      windSpeed: this.weatherData.hourly.wind_speed_10m[hourIndex],
      precipitation: this.weatherData.hourly.precipitation[hourIndex],
      precipitationProb:
        this.weatherData.hourly.precipitation_probability[hourIndex],
      cloudCover: this.weatherData.hourly.cloud_cover[hourIndex],
      weatherCode: this.weatherData.hourly.weather_code[hourIndex],
    };

    const aqiData = this.aqiData.hourly
      ? {
          aqi: this.aqiData.hourly.us_aqi[hourIndex],
          pm25: this.aqiData.hourly.us_aqi_pm2_5?.[hourIndex],
          pm10: this.aqiData.hourly.us_aqi_pm10?.[hourIndex],
          ozone: this.aqiData.hourly.us_aqi_ozone?.[hourIndex],
          no2: this.aqiData.hourly.us_aqi_nitrogen_dioxide?.[hourIndex],
          so2: this.aqiData.hourly.us_aqi_sulphur_dioxide?.[hourIndex],
          co: this.aqiData.hourly.us_aqi_carbon_monoxide?.[hourIndex],
        }
      : null;

    renderHourDetails(hourData, aqiData);
    this.openDrawer("hourDrawer");
  }

  async showDayDetails(dayIndex) {
    if (!this.weatherData.daily) return;

    const dayData = {
      date: this.weatherData.daily.time[dayIndex],
      tempMin: this.weatherData.daily.temperature_2m_min[dayIndex],
      tempMax: this.weatherData.daily.temperature_2m_max[dayIndex],
      precipitationSum: this.weatherData.daily.precipitation_sum[dayIndex],
      precipitationProbMax:
        this.weatherData.daily.precipitation_probability_max[dayIndex],
      windSpeedMax: this.weatherData.daily.wind_speed_10m_max[dayIndex],
      windGustMax: this.weatherData.daily.wind_gusts_10m_max[dayIndex],
      sunshineDuration: this.weatherData.daily.sunshine_duration[dayIndex],
      sunrise: this.weatherData.daily.sunrise[dayIndex],
      sunset: this.weatherData.daily.sunset[dayIndex],
    };

    // Try to get AQI data for this day if within 5-7 days
    let dayAqiData = null;
    if (dayIndex <= 5) {
      try {
        const targetDate = this.weatherData.daily.time[dayIndex];
        const aqiData = await getAQI(
          this.currentCity.latitude,
          this.currentCity.longitude,
          targetDate,
          targetDate
        );
        if (aqiData && aqiData.us_aqi) {
          const maxAqi = Math.max(...aqiData.us_aqi);
          const maxIndex = aqiData.us_aqi.indexOf(maxAqi);
          dayAqiData = {
            maxAqi,
            pm25: aqiData.us_aqi_pm2_5?.[maxIndex],
            pm10: aqiData.us_aqi_pm10?.[maxIndex],
            ozone: aqiData.us_aqi_ozone?.[maxIndex],
            no2: aqiData.us_aqi_nitrogen_dioxide?.[maxIndex],
            so2: aqiData.us_aqi_sulphur_dioxide?.[maxIndex],
            co: aqiData.us_aqi_carbon_monoxide?.[maxIndex],
          };
        }
      } catch (error) {
        console.error("Failed to load AQI for day:", error);
      }
    }

    renderDayDetails(dayData, dayAqiData);
    this.openDrawer("dayDrawer");
  }

  openDrawer(drawerId) {
    document.getElementById(drawerId).classList.remove("translate-x-full");
  }

  closeDrawer(drawerId) {
    document.getElementById(drawerId).classList.add("translate-x-full");
  }

  closeSidebar() {
    document.getElementById("climateSidebar").classList.add("hidden");
  }

  showLoading(loadingId) {
    document.getElementById(loadingId).classList.remove("hidden");
  }

  hideLoading(loadingId) {
    document.getElementById(loadingId).classList.add("hidden");
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async handleUseCurrentLocation() {
    const locationBtn = document.getElementById("useLocationBtn");
    const originalText = locationBtn.innerHTML;

    try {
      locationBtn.innerHTML =
        '<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg> Getting location...';
      locationBtn.disabled = true;

      const coords = await getCurrentLocation();
      const locationData = await reverseGeocode(
        coords.latitude,
        coords.longitude
      );

      // Create city object with GPS coordinates
      const gpsCity = {
        ...locationData,
        latitude: coords.latitude,
        longitude: coords.longitude,
        isGPS: true,
      };

      this.currentCity = gpsCity;

      let displayName = locationData.name || "Current Location";
      if (locationData.admin1) {
        displayName += `, ${locationData.admin1}`;
      }
      displayName += " (GPS)";

      document.getElementById("cityInput").value = displayName;
      await this.loadWeatherData();
    } catch (error) {
      console.error("GPS location failed:", error);
      alert(`Location access failed: ${error.message}`);
    } finally {
      locationBtn.innerHTML = originalText;
      locationBtn.disabled = false;
    }
  }
}

// Initialize the app
window.app = new WeatherApp();
