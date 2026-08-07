export type ScheduleFrequency = "manual" | "hourly" | "six_hours" | "daily";

export const scheduleLabels: Record<ScheduleFrequency, string> = {
  manual: "Manual only",
  hourly: "Every hour",
  six_hours: "Every 6 hours",
  daily: "Daily",
};

export function nextScheduledAt(frequency: ScheduleFrequency, from = new Date()): string | null {
  if (frequency === "manual") return null;
  const next = new Date(from);
  if (frequency === "hourly") next.setUTCHours(next.getUTCHours() + 1);
  if (frequency === "six_hours") next.setUTCHours(next.getUTCHours() + 6);
  if (frequency === "daily") {
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(12, 0, 0, 0);
  }
  return next.toISOString();
}

export function isScheduleFrequency(value: unknown): value is ScheduleFrequency {
  return value === "manual" || value === "hourly" || value === "six_hours" || value === "daily";
}

