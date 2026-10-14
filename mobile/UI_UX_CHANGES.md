# Mobile student UI/UX changes

Only mobile application files were changed. Web, backend, database, theme colors, MeshBlobs, and Backdrop artwork remain unchanged. New student screens reuse the existing cream/brown/mint palette, Lora typography, shared controls, gradients, MeshBlobs, and Backdrop.

## Added

- Menu → My Classes: enrolled classes, join by code, class details, teacher identity and read-only announcements.
- Trip → Tour Day: day selection, meeting point/map preview, camera/location check-in, attendance and permitted check-in photos, activities and announcements. Student owners/editors can select a meeting point from itinerary places or their current location, set its radius, mark attendance, and add/delete activities and announcements. Viewers can check in as allowed by the existing API.
- Crew editor/viewer labels and owner permission controls, using the existing permission endpoint.
- Trip view-only controls based on the server's `myRole`.
- Serial/coalesced trip saves, Saved/Saving/Unsaved/Failed state, explicit retry and navigation protection. Active trip screens refresh every 15 seconds without replacing local unsaved work.
- Place suggestions by destination/section category, filtered by the typed name; choosing a suggestion preserves its coordinates.
- Optional driving-route optimization for 3–12 located stops, preserving the first stop. The candidate is checked against routing estimates and confirmed before applying; manual reordering remains available.
- Daily expense/expected-cost breakdown and itinerary-place selection when recording an expense.
- Class/tour notification text, icons and route mapping; public profile URLs in shared messages.
- Per-account local journal draft recovery and navigation protection, image resizing, and preservation of uncommitted pros/cons text when posting.

## Improved

- Search cancellation/loading behavior; independent booking/crew/resource errors retain existing data and offer recovery.
- Preference writes are ordered; failed latest writes roll back to confirmed settings.
- Calendar MDY/DMY handling and Android Back dismissal; time picker correctly initializes from the existing time.
- Accessible field labels, primary-button states, selected calendar dates, and clearer map preview behavior/failure labels.
- Home See All selects the Profile Trips tab; hotel context initializes from navigation parameters.
- Animated values and screen initialization were refactored to resolve existing mobile lint errors.
- Camera and foreground location permission descriptions are configured in the mobile Expo config. Installed native builds need rebuilding for configuration changes to take effect.

## Verification

- `npm test`: four passing tests covering ordered/coalesced saving, failure/retry, student notification destinations, and route candidate integrity.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npx expo export --platform all --output-dir dist`: Android, iOS and Expo web bundles exported, including Classes and Tour Day routes. This checks the mobile project's browser target; it does not modify the separate web app.
- `git diff --check`: passed.

No authenticated API session, emulator, device camera/GPS session, or screenshot-based visual walkthrough was available during implementation. Test owner/editor/viewer accounts, class enrollment, denied permissions, out-of-radius check-in, offline retry, and real device draft storage before release.

## Boundaries

- No professor/admin mobile screens and no backend changes.
- Map remains a labeled preview with an external full-map action; no new map dependency was introduced.
- Notification preferences describe the in-app inbox. Native background push delivery was not added: it needs a configured delivery integration and device validation.
- Save ordering protects this client from overlapping PUTs. Cross-device simultaneous-edit conflict resolution still depends on the existing server contract.
- Local drafts are device-specific; failed local storage is displayed rather than claimed as saved.
