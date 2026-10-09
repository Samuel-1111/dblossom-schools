export async function enableBrowserNotifications(role, getSession = null) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    throw new Error("This browser does not support push notifications. Try a recent version of Chrome or Edge.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Browser notifications are blocked. Allow notifications for this website in your browser settings.");
  const session = typeof getSession === "function" ? await getSession() : null;
  const headers = { Accept: "application/json" };
  if (session?.access_token) headers.Authorization = "Bearer " + session.access_token;
  const configResponse = await fetch("/api/browser-notifications", { headers, credentials: "same-origin", cache: "no-store" });
  const config = await configResponse.json().catch(() => ({}));
  if (!configResponse.ok) throw new Error(config.error || "Could not check notification settings.");
  if (!config.enabled || !config.publicKey) throw new Error("Browser push is not configured on the school server yet. Add VAPID keys to the hosting environment first.");
  const registration = await navigator.serviceWorker.register("/service-worker.js");
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(config.publicKey) });
  const saveResponse = await fetch("/api/browser-notifications", {
    method: "POST", credentials: "same-origin", headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON(), role })
  });
  const saved = await saveResponse.json().catch(() => ({}));
  if (!saveResponse.ok) throw new Error(saved.error || "Could not save the browser notification subscription.");
  return "Browser notifications enabled for this device.";
}
function decodeKey(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64), output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}
