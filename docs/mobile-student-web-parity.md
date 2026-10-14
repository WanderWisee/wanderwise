# Mobile student frontend vs web

Scope: mobile frontend only; web is a read-only reference. Professor/admin screens are excluded. Source comparison, 14 October 2026; no rendered-device or authenticated runtime walkthrough was performed. No application code was changed.

## Confirmed gaps

| Priority | Feature | Student web behavior | Mobile gap and recommended counterpart |
| --- | --- | --- | --- |
| 1 | Trip access permissions | Trip builder reads `myRole`; viewers get a view-only notice and restricted controls | Trip hydration drops the role. Retain it, show role status, and gate editing and automatic saves. |
| 1 | Crew permission management | Owner toggles a member between view-only and editor; members see permission labels | Invitation sheet only adds/removes/shares/leaves. Add owner-only permission toggles and visible role labels. |
| 1 | Tour Day | Student owner/editors manage meeting point, geofence, attendance, announcements and activities; members can photo/location check in | No mobile screen, route, or service methods for these actions. Add a Tour Day entry from the trip, date selector, check-in status, permission feedback, and role-appropriate controls. These are student capabilities, not professor screens. |
| 1 | My Classes | Student joins with a class code, lists enrolled classes, opens class details and reads announcements | No mobile class screens/menu entry/service methods. Add My Classes, Join Class and class detail/announcements. Viewing teacher information does not mean implementing a teacher portal. |
| 2 | Student notification types/navigation | Notification text/icons support tour announcements and class events | Mobile helper lacks these cases; unknown text falls back to server English, and class links have no matching route. Add translations/icons and route mapping alongside the new screens. Tour links must open the relevant day rather than only trip overview. |
| 2 | Place discovery while planning | Destination-based suggested places, section/category suggestions, and search autocomplete let users choose a concrete place/coordinates | Mobile trip inputs accept typed place names and geocode afterward. Add selectable suggestions and retain selected coordinates, with loading/empty/error states. New Trip destination suggestions already exist and are a separate feature. |
| 2 | Automatic route optimization | Optimize one itinerary day's route with result/status feedback | Mobile already supports manual Move Up/Move Down and preserves `itineraryOrder`; add optional Optimize Day and result feedback. Manual reordering is not missing. |
| 2 | Budget by day | Budget breakdown shows category and day charts; Add Expense supports picking an itinerary place | Mobile has category bars, totals, expense list and per-place expected costs, but no daily breakdown or itinerary-place choice in the standalone expense form. Add day grouping and a place/day selector while keeping actual expenses distinct from estimates. |
| 2 | Share public profile | Share copies the actual `/profile/view/:userId` URL | Mobile shares name/bio/counts as text. Include the real public profile URL; use the existing configured web origin and account identifier. |
| 2 | Interactive map exploration | Web map components support interactive map behavior | Mobile OsmMap is a tile preview opening an external map; pin labels are not individually interactive. Provide a clear preview label and external action, or an interactive mobile map if full parity is required. Keeping a lightweight preview is a valid deliberate difference. |
| 2 | Save status | Web displays Saving/Saved/Save failed | Mobile trip only shows a saving spinner and an alert on some failures. Add a persistent status plus retry. Also fix ordering/recovery instead of copying the web autosave's existing navigation risk. |
| 2 | Background notifications | Web has notification watcher/OneSignal integration | Mobile has inbox/preferences but no native push integration found. Add a native equivalent only if closed-app reminders are required; preferences alone are not push delivery. Requires delivery/configuration validation beyond UI. |
| 3 | Date preferences | Account offers MDY/DMY preferences | Mobile offers the same preference but Home/New Trip/Hotels call a calendar helper hardcoded to MDY. Use the shared preference-aware formatter consistently. |

## Features already present: do not rebuild

- Student login, signup with OTP, password recovery, saved session and auth gate.
- Home, trip creation and destination autocomplete during creation.
- Trip Overview/Itinerary/Budget, sections, places, notes, visited state, scheduled time, costs, date assignment and manual stop reordering.
- Budget totals, remaining/over-budget state, category breakdown and expense deletion.
- Crew search, invitations, share links, member removal and leaving a trip, subject to the permission gaps above.
- Hotel external search and recording/removing bookings with trip linkage.
- Guides, student stories, built-in Boracay guide, journals with images/ratings/pros/cons/hotels and comments.
- Own/public student profiles, student search, profile avatar/bio/location editing.
- History filters, notification inbox/read actions, language and date/time/distance preferences.

These features were identified in source; this list is not a claim that every runtime path has been tested.

## Deliberate differences and constraints

- Do not copy the desktop navbar, charts or drag-and-drop layout literally. Sheets, tabs, compact charts and Move Up/Down can provide the same student outcome on a phone.
- Do not flag locked account name/email as a missing backend-backed feature: web comments explicitly say those edits are local-only. Mobile's locked fields are more honest until there is a supported account update contract.
- Do not add professor/admin routes, dashboards, grading, moderation or class management to mobile.
- Do not treat the unrouted web TeacherAssignmentPage as a mobile student requirement.
- Web is a reference for student outcomes, not a requirement to reproduce nonfunctional controls or errors that appear empty.
- Existing APIs cover classes, trip permissions and tour operations in the inspected web callers. Reuse the contracts from mobile services; verify authorization and native image/location permissions. Native push and app-link delivery may require configuration or server work and cannot be promised as frontend-only changes.

## Files to extend in mobile

| Area | Main mobile files |
| --- | --- |
| Permissions, saving, suggestions, optimization, budget | `app/trip/[id].tsx`, `services/tripService.js`, `services/geoService.js` |
| Crew roles | `components/InviteTripmatesSheet.js`, `services/tripService.js` |
| Classes | New student class routes/services; `components/MenuSheet.js` |
| Tour Day | New trip tour route/services; `app/trip/[id].tsx` entry point |
| Notification integration | `utils/notificationText.js`, i18n files, new class/tour routes |
| Profile URL sharing | `app/(tabs)/profile.tsx`, existing web origin configuration |
| Calendar consistency | `components/CalendarPicker.js`, Home, Hotels, New Trip |

## Reference files inspected

Web: `App.js`, `TripPlanBuilderPage.jsx`, `InviteCrewPage.jsx`, `TourDayPage.jsx`, `MyClassesPage.jsx`, `ClassViewPage.jsx`, `AddExpensePage.jsx`, `BudgetBreakdownPage.jsx`, `ProfilePage.jsx`, `SettingsPage.jsx`, map components and notification helper. Mobile: route inventory, trip detail, shared controls/maps/invitation sheet, student tabs, services, preferences, history and notification helper.

## Implementation sequence

1. Correct trip permissions and crew role controls so existing collaboration works honestly.
2. Add student Tour Day/check-in and Classes/announcements, then notification destinations.
3. Add place suggestions, daily budget breakdown, itinerary-linked expense entry and profile URL sharing.
4. Add route optimization and any chosen interactive-map/native-push scope.
5. Verify mobile flows against the same student accounts/data on the unchanged web application; check owner/editor/viewer, language/date formats, slow/offline network and denied camera/location permissions.
