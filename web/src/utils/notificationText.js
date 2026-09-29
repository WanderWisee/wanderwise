// Builds the on-screen text of a notification from its type + data, so it
// follows the English/Tagalog setting and the time format. Falls back to
// the English message saved on the server for anything unknown.
export function parseNotificationData(n) {
  if (!n?.data) return {};
  if (typeof n.data === "object") return n.data;
  try {
    return JSON.parse(n.data);
  } catch {
    return {};
  }
}

export function notificationText(n, t, formatTime) {
  const d = parseNotificationData(n);
  const trip = d.tripDestination ? `${t("tripToPrefix")} ${d.tripDestination}` : "";
  const when = d.when === "today" ? t("notifWhenToday") : t("notifWhenTomorrow");

  switch (n.type) {
    case "trip_start":
      return `${trip} ${t("notifTextTripStarts")} ${when}.`;
    case "activity":
      return `${t("notifTextComingUp")} ${formatTime ? formatTime(d.time) : d.time}: ${d.placeName} (${trip})`;
    case "checkin":
      return `${t("notifTextCheckIn")} ${when}: ${d.placeName} (${trip})`;
    case "crew_added":
      return `${d.actorName} ${t("notifTextAddedYou")} ${trip}.`;
    case "crew_joined":
      return `${d.actorName} ${t("notifTextJoinedTrip")} ${trip}.`;
    case "comment":
      return `${d.actorName} ${t("notifTextCommented")} ${d.journalTitle || t("notifYourStory")}.`;
    default:
      return n.message || "";
  }
}

export function notificationIcon(type) {
  switch (type) {
    case "trip_start":
      return "🧳";
    case "activity":
      return "⏰";
    case "checkin":
      return "🏨";
    case "crew_added":
    case "crew_joined":
      return "👥";
    case "comment":
      return "💬";
    default:
      return "🔔";
  }
}