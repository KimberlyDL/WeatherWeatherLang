export function drainageAdvisor(dailyData, period) {
  const todayIndex = period === "today" ? 0 : 1;
  const precipSum = dailyData.precipitation_sum[todayIndex] || 0;

  let status, reason;

  if (precipSum >= 20) {
    status = "Not ideal";
    reason = `Heavy rain expected • 💧 ${precipSum}mm`;
  } else if (precipSum >= 5) {
    status = "Caution";
    reason = `Moderate rain • 💧 ${precipSum}mm`;
  } else {
    status = "Good";
    reason = `Light/no rain • 💧 ${precipSum}mm`;
  }

  return {
    activity: "Drainage Check",
    status,
    reason,
    period,
  };
}
