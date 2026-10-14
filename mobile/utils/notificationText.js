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
    case 'announcement':
      return `${d.actorName} ${t('notifAnnouncement')}: ${d.message || ''}`;
    case 'class_added':
      return `${d.actorName} ${t('notifClassAdded')} ${d.className}.`;
    case 'class_removed':
      return `${d.actorName} ${t('notifClassRemoved')} ${d.className}.`;
    case 'journal_hidden':
      return `${t('notifJournalHidden')} "${d.title || ''}"${d.reason ? `: ${d.reason}` : '.'}`;
    case 'class_announcement':
      return `${d.actorName} (${d.className}): ${d.message || ''}`;
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
    case 'announcement':
    case 'class_announcement': return 'message';
    case 'class_added':
    case 'class_removed': return 'graduation';
    case 'journal_hidden': return 'ban';
    case "trip_start":
      return "suitcase";
    case "activity":
      return "clock";
    case "checkin":
      return "hotel";
    case "crew_added":
    case "crew_joined":
    case "crew_removed":
    case "crew_left":
      return "users";
    case "comment":
      return "message";
    case "trip_updated":
      return "pencil";
    case "expense_added":
      return "wallet";
    case "booking_added":
      return "hotel";
    case "budget_80":
      return "warning";
    case "budget_over":
      return "warning";
    case "trip_ended":
      return "book";
    case "password_changed":
      return "lock";
    default:
      return "bell";
  }
}
// Ang "link" ng notification ay para sa web ("/trip-plan?tripId=5",
// "/journal/view/9"). Isinasalin ito sa route ng mobile app.
export function notificationRoute(n) {
  const link = String(n?.link || '');
  const cls = link.match(/\/classes\/(\d+)/);
  if (cls) return `/classes/${cls[1]}`;
  if (link === '/classes') return '/classes';
  const trip = link.match(/tripId=(\d+)/);
  if (trip && link.includes('/tour')) {
    const day = link.match(/[?&]date=(\d{4}-\d{2}-\d{2})/);
    return `/tour/${trip[1]}${day ? `?date=${day[1]}` : ''}`;
  }
  if (trip) return `/trip/${trip[1]}`;
  const journal = link.match(/\/journal\/view\/(\d+)/);
  if (journal) return `/journal/${journal[1]}`;
  const d = parseNotificationData(n);
  if (d.classId) return `/classes/${d.classId}`;
  if (d.tripId) return `/trip/${d.tripId}`;
  return null;
}
