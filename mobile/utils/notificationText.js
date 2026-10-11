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
    case "crew_removed":
      return `${d.actorName} ${t("notifTextRemovedYou")} ${trip}.`;
    case "crew_left":
      return `${d.actorName} ${t("notifTextLeftTrip")} ${trip}.`;
    case "trip_updated":
      return `${d.actorName} ${t("notifTextUpdatedTrip")} ${trip}.`;
    case "expense_added":
      return `${d.actorName} ${t("notifTextAddedExpense")} ${trip}: ${d.category} ₱${d.amount}`;
    case "booking_added":
      return `${d.actorName} ${t("notifTextRecordedBooking")} ${trip}: ${d.placeName}`;
    case "budget_80":
      return `${t("notifTextBudgetUsed")} ${d.percent}% ${t("notifTextOfBudget")} ${trip} (₱${d.spent} / ₱${d.budget})`;
    case "budget_over":
      return `${trip} ${t("notifTextOverBudget")} (₱${d.spent} / ₱${d.budget})`;
    case "trip_ended":
      return `${trip} ${t("notifTextTripEnded")}`;
    case "password_changed":
      return t("notifTextPasswordChanged");
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
    case "crew_removed":
    case "crew_left":
      return "👥";
    case "comment":
      return "💬";
    case "trip_updated":
      return "✏️";
    case "expense_added":
      return "💸";
    case "booking_added":
      return "🏨";
    case "budget_80":
      return "⚠️";
    case "budget_over":
      return "🚨";
    case "trip_ended":
      return "📖";
    case "password_changed":
      return "🔒";
    default:
      return "🔔";
  }
}
// Ang "link" ng notification ay para sa web ("/trip-plan?tripId=5",
// "/journal/view/9"). Isinasalin ito sa route ng mobile app.
export function notificationRoute(n) {
  const link = String(n?.link || '');
  const trip = link.match(/tripId=(\d+)/);
  if (trip) return `/trip/${trip[1]}`;
  const journal = link.match(/\/journal\/view\/(\d+)/);
  if (journal) return `/journal/${journal[1]}`;
  const d = parseNotificationData(n);
  if (d.tripId) return `/trip/${d.tripId}`;
  return null;
}
