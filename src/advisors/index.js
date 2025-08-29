import { laundryAdvisor } from "./laundry.js";
import { runAdvisor } from "./run.js";
import { drainageAdvisor } from "./drainage.js";
import { waterPlantsAdvisor } from "./waterPlants.js";
import { carWashAdvisor } from "./carWash.js";
import { commuteAdvisor } from "./commute.js";
import { secureItemsAdvisor } from "./secureItems.js";
import { heatRiskAdvisor } from "./heatRisk.js";

export function calculateAdvisors(hourlyData, dailyData) {
  if (!hourlyData || !dailyData) return [];

  const advisors = [
    // Today advisors
    runAdvisor(hourlyData, "today"),
    carWashAdvisor(hourlyData, "today"),
    commuteAdvisor(hourlyData, "today"),
    secureItemsAdvisor(hourlyData, "today"),
    heatRiskAdvisor(hourlyData, "today"),
    drainageAdvisor(dailyData, "today"),

    // Tomorrow advisors
    laundryAdvisor(hourlyData, "tomorrow"),
    waterPlantsAdvisor(hourlyData, dailyData, "tomorrow"),
  ];

  // Sort by status priority (non-Good first)
  return advisors.sort((a, b) => {
    const priority = { "Not ideal": 0, Caution: 1, Good: 2 };
    return priority[a.status] - priority[b.status];
  });
}
