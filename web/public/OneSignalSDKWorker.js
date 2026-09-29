// Needed by OneSignal so push notifications can show up on this computer
// even when the WanderWise tab is closed. Must stay in web/public so it's
// served from the site root (http://localhost:3000/OneSignalSDKWorker.js).
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");