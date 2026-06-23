// OneSignal Web Push service worker — isolated in /push/onesignal/ scope so it
// never conflicts with the app's PWA caching worker at /sw.js (scope "/").
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
