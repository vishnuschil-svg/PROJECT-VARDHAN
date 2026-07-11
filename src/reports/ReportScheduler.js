export const REPORT_DELIVERY_CHANNELS = {
  DOWNLOAD: "DOWNLOAD",
  EMAIL: "EMAIL_FUTURE",
  WHATSAPP: "WHATSAPP_FUTURE",
};

export function createReportScheduleModel(schedule = {}) {
  return {
    id: schedule.id || "",
    reportId: schedule.reportId || "",
    cadence: schedule.cadence || "manual",
    deliveryChannel: schedule.deliveryChannel || REPORT_DELIVERY_CHANNELS.DOWNLOAD,
    recipients: schedule.recipients || [],
    status: schedule.status || "future-ready",
    nextRunAt: schedule.nextRunAt || "",
  };
}

export function buildScheduleSummary(schedules = []) {
  return {
    total: schedules.length,
    enabled: schedules.filter((schedule) => schedule.status === "active").length,
    futureChannels: ["Email", "WhatsApp", "Scheduled Reports"],
  };
}
