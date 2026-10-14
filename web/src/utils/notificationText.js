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
    case "announcement":
      return `📢 ${d.actorName} ${t("notifTextAnnounced")} ${trip}: ${d.message}`;
    case "password_changed":
      return t("notifTextPasswordChanged");
    // Teacher portal / admin panel
    case "class_added":
      return `${d.actorName} ${t("notifTextClassAdded")} ${d.className}.`;
    case "class_announcement":
      return `📢 ${d.actorName} (${d.className}): ${d.message}`;
    case "student_joined":
      return `${d.actorName} ${t("notifTextStudentJoined")} ${d.className}.`;
    case "class_removed":
      return `${d.actorName} ${t("notifTextClassRemoved")} ${d.className}.`;
    case "teacher_pending":
      return `${d.actorName} ${t("notifTextTeacherPending")}`;
    case "teacher_approved":
      return t("notifTextTeacherApproved");
    case "journal_hidden":
      return `${t("notifTextJournalHidden")} "${d.title}"${d.reason ? `: ${d.reason}` : "."}`;
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
    case "announcement":
      return "📢";
    case "password_changed":
      return "🔒";
    case "class_added":
    case "teacher_approved":
      return "🎓";
    case "class_announcement":
      return "📢";
    case "student_joined":
      return "🙋";
    case "class_removed":
      return "🚪";
    case "teacher_pending":
      return "🧑‍🏫";
    case "journal_hidden":
      return "🚫";
    default:
      return "🔔";
  }
}