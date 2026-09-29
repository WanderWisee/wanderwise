// OneSignal web push — real notifications on the laptop, even when the
// WanderWise tab is closed. The backend sends to OneSignal using the
// WanderWise user id; this file links this browser to that user id.
//
// Paste your OneSignal App ID below (OneSignal → Settings → Keys & IDs).
// The App ID is not secret — it's fine in frontend code. The API key is
// secret and goes ONLY in backend/.env.
export const ONESIGNAL_APP_ID = "";

export const isOneSignalEnabled = () => ONESIGNAL_APP_ID.trim() !== "";

let initStarted = false;
let linkedUserId = null;

function withOneSignal(fn) {
  if (!isOneSignalEnabled()) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(fn);
}

// Loads the OneSignal script once and starts it.
export function initOneSignal() {
  if (!isOneSignalEnabled() || initStarted) return;
  initStarted = true;

  const script = document.createElement("script");
  script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
  script.defer = true;
  document.head.appendChild(script);

  withOneSignal(async (OneSignal) => {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      // Lets push work on http://localhost while developing/demoing.
      allowLocalhostAsSecureOrigin: true,
    });
  });
}

// The WanderWise user id is inside the login token ("sub").
export function userIdFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

// Link this browser to the logged-in student, so pushes for them land here.
export function loginOneSignal(userId) {
  if (!userId || linkedUserId === userId) return;
  linkedUserId = userId;
  withOneSignal(async (OneSignal) => {
    await OneSignal.login(userId);
  });
}

// After logging out, stop sending that student's pushes to this browser.
export function logoutOneSignal() {
  if (linkedUserId === null) return;
  linkedUserId = null;
  withOneSignal(async (OneSignal) => {
    await OneSignal.logout();
  });
}

// Asks the browser for permission (must be called from a button click).
export async function requestPushPermission() {
  if (!isOneSignalEnabled()) {
    return typeof Notification !== "undefined" ? Notification.requestPermission() : "unsupported";
  }
  return new Promise((resolve) => {
    withOneSignal(async (OneSignal) => {
      await OneSignal.Notifications.requestPermission();
      resolve(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
    });
  });
}