# WanderWise frontend UI/UX review

Review date: 14 October 2026

## Scope and evidence

Mobile is **student-only**. Professor and administrator interfaces belong to the web only; their absence from mobile is intentional and is not a defect.

This is a source-based audit, not a screenshot or device usability test. The inventory covers 136 frontend source/configuration files across `mobile`, `web/src`, and relevant `web/public` files. Every inventoried file was read by the static inventory scan; detailed manual inspection focused on routes, primary screens, shared components, state, services, permissions, and error handling. Inventory counts are search signals, not proof that a file is accessible or correct. Binary images, dependencies, lockfile contents, and generated builds were not individually reviewed. Backend trip permissions were checked to establish the frontend contract.

See `frontend-audit-inventory.csv` for file coverage. No application source was changed.

## Assessment

The cream/brown/mint identity, shared controls, empty/error components, date picker, trip creation, journals, bookings, and invitation flows already provide a usable foundation. The biggest gaps concern trust: controls that cannot succeed for a user's role, edits that can appear saved when they are not, and failures that look like empty data. Address those before decorative redesign.

Priority: P1 = likely data loss, blocked primary action, or misleading state; P2 = navigation, accessibility, recovery, or consistency; P3 = polish or scale improvement. Findings below are confirmed source behavior or explicitly labeled risks; runtime reproduction remains necessary.

## P1: fix first

### 1. Mobile ignores trip viewer permissions

Evidence: `mobile/app/trip/[id].tsx`, `hydrateTrip`, `persist`, and editable place/list controls; `mobile/components/InviteTripmatesSheet.js`; `backend/Controllers/TripsController.cs`, `GetMyRoleAsync`, `CanEditTripAsync`, and crew permission endpoint.

The backend returns `myRole` and creates invited members with `CanEdit = false`. Mobile drops `myRole` during hydration and exposes edit controls regardless. Viewer edits are applied locally before PUT fails. The invitation sheet supports adding/removing people but has no editor permission toggle. Web already handles viewer mode.

Fix: retain the role, show a view-only explanation, hide/disable mutations, prevent geocoding from saving for viewers, and give owners an explicit permission control. Check expense and booking actions against their own endpoint permissions as well.

Verify with owner, editor, and newly invited viewer accounts; viewers must never see a locally successful edit followed by a rejection.

### 2. Mobile optimistic saving lacks recovery and request ordering

Evidence: `mobile/app/trip/[id].tsx`, `persist` and `useAutoGeocode` callback.

`persist` changes local state, starts a full-trip PUT, catches errors, and leaves edited state visible. Silent saves suppress the alert. There is no durable failed/unsaved state, retry control, rollback, or serialized save queue. Multiple overlapping full-trip saves can arrive out of order; the shared boolean spinner can stop while another request is pending. This is a data-loss risk, not a reproduced server race.

Fix: serialize/coalesce saves, track revisions and pending work, show Saving/Saved/Failed with retry, and retain failed edits. Add server conflict protection for simultaneous editors rather than assuming frontend ordering solves collaboration.

### 3. Web autosave can discard the final edit on navigation

Evidence: `web/src/pages/trip-plan-builder/TripPlanBuilderPage.jsx`, autosave effect around lines 667–700.

Autosave waits 1.2 seconds; effect cleanup cancels its timer. Leaving before the timer fires can discard the latest change. Failures show a status label but no explicit retry action. No draft/navigation protection was found in the frontend search.

Fix: maintain a recoverable draft and pending state; flush supported navigation or guard it until save completes. Provide retry after failure. Verify typing followed immediately by Back, Home, refresh, and closing the tab.

### 4. Mobile search spinner can remain stuck after clearing a query

Evidence: `mobile/app/search.tsx` and `mobile/components/InviteTripmatesSheet.js`, debounced search effects.

For a two-character query, loading becomes true before the debounce runs. Clearing to fewer than two characters cancels that work, but the short-query branch never resets loading/searching. The abandoned request's guarded finalizer cannot reset it either.

Fix: reset loading in the short-query branch and retain cancellation protection. Verify typing two letters then clearing within 300 ms and during an in-flight request.

### 5. A failed pending invite is silently consumed

Evidence: `mobile/services/pendingJoin.js`, `consumePendingJoin`; login/signup completion handlers.

The pending invite is removed before joining succeeds. A failed join returns null, and login continues to Home with no join error. The intended destination is lost.

Fix: delete the pending token only after success or a clearly terminal invalid-link response. Display a retryable join error after successful authentication.

## P2: usability, recovery, and accessibility

### 6. Errors are represented as empty records

Evidence: mobile Hotels `loadBookings`, Profile `fetchMyJournal().catch(() => [])`, trip detail expense/crew/booking catches, and Invite sheet `loadCrew`. On web, Admin Users/Journals/Logs loaders use unsuccessful response → `[]`.

Users cannot distinguish an empty account from unavailable data. Budget/crew displays may be incomplete without warning. Preserve last good data and show loading/error/empty states separately, with retry for each independent section.

### 7. Failed settings saves leave the switch/chip changed

Evidence: `mobile/context/AppContext.js`, `updatePrefs`; settings notification/preference screens.

Preferences are written to local state and storage before the API request. Failure returns false and shows a brief toast, but the UI remains changed and later server refresh may replace it. Explicitly distinguish local/pending/synced preferences or roll back failures; offer retry. Rapid toggles also need ordered writes.

### 8. Home's primary travel navigation is indirect

Evidence: `mobile/app/(tabs)/home.tsx`, Continue Planning `See all` action; Profile Trips tab.

See all opens Profile without forcing the Trips tab. Trips are therefore hidden behind an identity screen and potentially the Journal tab retained by navigation. Add an explicit My Trips entry or route parameters that select Trips. Choose Continue Planning by a stated criterion such as recently edited/active trip, rather than relying on `trips[0]` ordering.

### 9. Hotel controls imply more functionality than they deliver

Evidence: mobile Home travelers row; mobile Hotels `openSite`; web `HotelSearchResultsPage.jsx`.

Home shows an unlabeled traveler number. Hotel traveler counters are not included in outgoing provider searches. The web results date control has button styling but no click handler. Search context exists only in router state on the web results page, so a direct visit has no destination.

Fix: label whether the count means total guests or companions, transmit supported provider parameters, and remove unused controls. Make dates editable or present them as text. Use URL search parameters and a helpful missing-search state. External provider URL behavior still needs live verification.

### 10. Accessibility is inconsistent

Evidence: `mobile/components/ui.js`, mobile Home counters, `PlaceCard.js`; web `PortalHeader.jsx`, `ClassSummaryTab.jsx`, and page navbar icon spans.

Many mobile controls lack explicit roles/state; some icon labels are only +/−. Some web navigation and clickable rows are spans/divs/paragraphs without keyboard interaction. Use buttons/links, descriptive names, selected/disabled/busy state, and field-label association. Shared mobile `Field` renders a visible label but does not associate it with the input.

### 11. Dialog focus handling is incomplete

Evidence: web `context/DialogContext.jsx`; mobile dialog provider; admin journal and teacher photo overlays.

Web shared dialog focuses its confirmation button and handles Escape, but does not trap focus, restore focus, or give the dialog an accessible name. Several custom overlays also lack dialog semantics. Standardize modal behavior and test keyboard, TalkBack, VoiceOver, long content, and large text. Avoid defaulting keyboard focus to a destructive confirmation.

### 12. Small touch targets and fixed control heights need device checks

Evidence: Home bell is 34×34 without hitSlop; shared square controls are 34×34 (some compensate with hitSlop); cost removal and calendar controls are compact.

Increase effective touch regions and ensure font scaling does not clip fixed-height text controls. This is source-indicated risk; no device measurement or visual clipping test was performed.

### 13. Calendar formatting ignores preference

Evidence: `mobile/components/CalendarPicker.js`, exported `formatDate`; Home, Hotels, New Trip; `AppContext.js` date formatters.

The calendar helper always returns MM/DD/YYYY while account preferences support DD/MM/YYYY. Month/day names and several guide/duration strings remain English. Use one preference-aware formatter and translate interface text. User-authored stories need not be translated automatically.

### 14. Map previews need clearer behavior and failure states

Evidence: `mobile/components/OsmMap.js` and `mobile/app/guide/[id].tsx`.

The map is a static tile preview; tapping opens an external site. Individual pins are not actionable and their labels are not rendered. Tile images have no error state. An unresolved geocode can retain the Loading map label indefinitely. Label the preview/external action and add failed-location and retry states. Interactive map gestures are an optional enhancement, not an assumed requirement.

### 15. Student collaboration does not refresh while the screen stays open

Evidence: trip detail loads through `useFocusEffect`; `mobile/hooks/useLiveSync.js` exists but is not used by the trip screen.

A web/crew edit is not automatically reflected while the student remains on the mobile trip screen. Introduce safe refresh with dirty-state/conflict handling. Do not overwrite a student's unsaved edits with a background response.

### 16. Notification settings suggest push support that mobile does not implement

Evidence: mobile notification settings heading, `mobile/package.json`, notification screen and Home focus loaders. Web has OneSignal/NotificationWatcher integrations.

Mobile has an in-app inbox but no native notification registration/delivery integration found in the reviewed source. Distinguish in-app notification preferences from background push. If reminders must arrive with the app closed, implement native permission, delivery, and deep-link flows and test on physical devices.

### 17. Long journal forms have no draft protection

Evidence: `mobile/app/new-post.tsx`, local entries/photo state and direct header Back action.

Leaving can lose the composed story. Submission may take up to 90 seconds, but the UI offers no durable draft or upload progress. Preserve a draft, warn on discarding meaningful edits, constrain/compress image dimensions and total payload, and show useful submission status. Add clear inline validation rather than relying only on dialogs.

### 18. Professor web failures need specific recovery

Evidence: `TeacherClassPage.jsx` `loadClass`, `saveClass`, `newCode`, `deleteClass`; `TeacherStudentPage.jsx` detail loading.

Class load failures are collapsed into not found/access failure; several mutations only handle success with no visible failure state or pending protection. Show network error vs missing vs forbidden separately; preserve typed form values and add retry/pending feedback. Existing summary/export/student-view capabilities should be retained.

### 19. Administrator moderation/search needs stronger operation feedback

Evidence: `AdminPage.jsx`, Users/Journals/Logs loaders and `setHidden`.

Debounce cancels timers but not already started requests, allowing older search results to replace newer results. Journal visibility updates have no visible failure feedback or busy guard. Add latest-request protection, explicit retry, and operation state. Account deactivation already has confirmation and busy handling; extend that consistency to moderation.

### 20. Unknown web routes have no recovery page

Evidence: `web/src/App.js`, Routes has no `*` fallback.

An invalid app path can render no page content. Add a useful Not Found screen with role-appropriate Home and Back actions. Also distinguish expired sessions from generic load errors consistently across web API callers.

## Product-scope decisions, not automatic defects

- **Student Classes and Tour Day:** web has student class enrollment/announcements and tour/check-in flows; mobile has no equivalent routes. This is separate from professor/admin access. If mobile students must enroll, read class announcements, or check in during field trips, add these student experiences. If deliberately web-only, state that clearly and provide a web handoff. Do not add professor/admin screens to mobile.
- **Route optimization:** web supports optimization; mobile already has working Move Up/Move Down controls (`moveStop` and itinerary reorder buttons). The missing counterpart is automatic route optimization, not manual reordering.
- **TeacherAssignmentPage:** the file exists but is not imported/routed by `App.js`; current Teacher Class tabs intentionally list summary/students/announcements. Treat it as inactive or legacy until grading/assignments are explicitly in scope.
- **Dark mode/tablets:** app configuration advertises automatic interface style and tablet support, while mobile screens use fixed light colors and phone-style layouts. Validate supported experiences before promising them. A deliberate light-only app is acceptable.

## Visual polish and performance follow-up

- Keep the established palette. Consolidate repeated typography, spacing, radius, feedback colors, and button variants; web uses Georgia while mobile uses Lora.
- Separate readable body/form typography from decorative branding if device testing shows dense serif forms are hard to scan.
- Use consistent vector icons for controls; reserve emoji for decorative content where platform variation is acceptable.
- Profile trips/journals and Guides render potentially large arrays inside ScrollViews; use pagination and virtualized lists when real data warrants it. Guides currently requests 200 feed entries and has no load-more path.
- Reduce competing Home sections only after task testing: Continue Planning/My Trips/Create Trip should remain easy to find above exploratory content.
- Existing web responsive rules, focus-visible styling, and reduced-motion rules are positives. Do not infer responsive failure just from fixed widths; verify actual pages.

## Verification results

Commands executed against this working tree during the audit:

| Check | Result |
| --- | --- |
| Mobile `npx.cmd tsc --noEmit` | Passed |
| Mobile `npm.cmd run lint` | Failed: 28 errors, 18 warnings |
| Web `npm.cmd run build` | Passed with 3 unused-variable warnings |

Lint includes effect state updates, ref access rules, dependency warnings, and unused imports. These are tooling findings, not proof that all affected screens visibly fail. Web warnings concern DashboardPage, JournalViewPage, and TripPlanBuilderPage. Existing `web/src/App.test.js` still expects the Create React App “learn react” link and is not a meaningful WanderWise acceptance test; it was inspected, not executed.

No browser walkthrough, authenticated end-to-end session, emulator, accessibility reader, or device screenshot comparison was performed. No claim is made that the rendered UI was visually inspected. Terminal encoding displayed some Unicode characters incorrectly, so this report does not diagnose broken source text from terminal appearance alone.

## Suggested implementation order and acceptance checks

1. Role-correct mobile trip controls and permission management. Verify owner/editor/viewer actions against backend responses.
2. Reliable save state, ordered requests, retry, and draft preservation. Test offline failure, rapid edits, navigation before autosave, and two simultaneous editors.
3. Correct search loading reset, failed invitation recovery, and section-specific error states.
4. My Trips navigation, meaningful hotel controls, consistent dates, and notification wording.
5. Professor/admin failure feedback and accessible shared controls/modals.
6. Confirm student Classes/Tour Day mobile scope, then test responsive layouts and visual refinements.

Manual test matrix: narrow phone, common Android phone, iPhone safe areas, tablet if supported, desktop web, keyboard-only web, large text, Filipino/English, both date formats, slow/offline network, expired session, empty and large accounts, owner/editor/viewer, professor web, administrator web. Record screenshots and reproduction steps before calling visual issues confirmed.
