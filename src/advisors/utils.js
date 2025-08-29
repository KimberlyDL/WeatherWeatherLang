export function getTimeWindow(hourlyData, period) {
  const now = new Date();
  const currentHour = now.getHours();

  switch (period) {
    case "today":
      // First 12 hours from current time
      return sliceHourlyData(hourlyData, 0, 12);
    case "tomorrow":
      // Hours 12-36 (next day)
      return sliceHourlyData(hourlyData, 12, 36);
    case "next12h":
      return sliceHourlyData(hourlyData, 0, 12);
    case "next24h":
      return sliceHourlyData(hourlyData, 0, 24);
    default:
      return sliceHourlyData(hourlyData, 0, 12);
  }
}

function sliceHourlyData(hourlyData, start, end) {
  const result = {};
  for (const [key, values] of Object.entries(hourlyData)) {
    if (Array.isArray(values)) {
      result[key] = values.slice(start, end);
    }
  }
  return result;
}

export function maxOf(arr) {
  return Math.max(...arr.filter((val) => val !== null && val !== undefined));
}

export function avgOf(arr) {
  const validValues = arr.filter((val) => val !== null && val !== undefined);
  return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
}

export function medianOf(arr) {
  const validValues = arr
    .filter((val) => val !== null && val !== undefined)
    .sort((a, b) => a - b);
  const mid = Math.floor(validValues.length / 2);
  return validValues.length % 2 === 0
    ? (validValues[mid - 1] + validValues[mid]) / 2
    : validValues[mid];
}

export function hoursMeeting(arr, condition) {
  let consecutiveCount = 0;
  let maxConsecutive = 0;

  for (const value of arr) {
    if (condition(value)) {
      consecutiveCount++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
    } else {
      consecutiveCount = 0;
    }
  }

  return maxConsecutive;
}
