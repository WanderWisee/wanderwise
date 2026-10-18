// OneSignal web push — real notifications on the laptop, even when the
// WanderWise tab is closed. The backend sends to OneSignal using the
// WanderWise user id; this file links this browser to that user id.
//
// Paste your OneSignal App ID below (OneSignal → Settings → Keys & IDs).
// The App ID is not secret — it's fine in frontend code. The API key is
// secret and goes ONLY in backend/.env.
export const ONESIGNAL_APP_ID = "57f8e7f3-e31c-44cd-b3ad-8aa929b478c1";


export const isOneSignalEnabled = () => ONESIGNAL_APP_ID.trim() !== "";

let initStarted = false;
let initFailed = false;
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
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        // Lets push work on http://localhost while developing/demoing.
        allowLocalhostAsSecureOrigin: true,
      });
    } catch (err) {
      // e.g. "Can only be used on: <other site>" when the Site URL in the
      // OneSignal dashboard doesn't match this website.
      initFailed = true;
      console.warn("OneSignal could not start:", err?.message || err);
    }
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
// If OneSignal can't start, the browser's own prompt is used instead, so the
// "Turn on pop-ups" button always does something (before, it did nothing).
function nativePermission() {
  if (typeof Notification === "undefined") return Promise.resolve("unsupported");
  try {
    return Promise.resolve(Notification.requestPermission()).catch(() => Notification.permission);
  } catch {
    return Promise.resolve(Notification.permission);
  }
}

export async function requestPushPermission() {
  if (!isOneSignalEnabled() || initFailed || !window.OneSignal) {
    return nativePermission();
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    // Safety net: OneSignal didn't answer in time → browser prompt.
    const timer = setTimeout(() => nativePermission().then(finish), 4000);
    withOneSignal(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
      } catch {
        // fall through to whatever the browser says
      }
      clearTimeout(timer);
      if (!done && typeof Notification !== "undefined" && Notification.permission === "default") {
        finish(await nativePermission());
      } else {
        finish(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
      }
    });
  });
}