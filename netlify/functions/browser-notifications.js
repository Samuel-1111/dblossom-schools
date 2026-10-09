const { admin, userFrom, isAdmin } = require("./_supabase");
const json = (statusCode, body) => ({ statusCode, headers: { "content-type": "application/json", "cache-control": "no-store" }, body: JSON.stringify(body) });
const vapidPublic = () => String(process.env.VAPID_PUBLIC_KEY || "").trim();
const ready = () => !!(vapidPublic() && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
function webPush() {
  const wp = require("web-push");
  wp.setVapidDetails(process.env.VAPID_SUBJECT, vapidPublic(), process.env.VAPID_PRIVATE_KEY);
  return wp;
}
async function deliver(db, rows, payload) {
  if (!ready() || !rows?.length) return;
  let wp;
  try { wp = webPush(); } catch (e) { console.error("Web Push is not configured:", e.message); return; }
  await Promise.all(rows.map(async row => {
    try {
      await wp.sendNotification(row.subscription, JSON.stringify(payload), { TTL: 60 * 60 });
    } catch (e) {
      const code = Number(e.statusCode || e.status || 0);
      if (code === 404 || code === 410) {
        try { await db.from("browser_push_subscriptions").delete().eq("id", row.id); } catch (_) {}
      } else console.error("Browser push delivery failed:", code || e.message);
    }
  }));
}
async function notifyProfile(db, profileId, payload) {
  try {
    if (!profileId || !ready()) return;
    const { data, error } = await db.from("browser_push_subscriptions").select("id,subscription").eq("profile_id", profileId).eq("enabled", true);
    if (error) { console.error("Browser push subscription lookup failed:", error.message); return; }
    await deliver(db, data || [], payload);
  } catch (e) { console.error("Browser push delivery skipped:", e.message); }
}
async function notifyRole(db, role, payload) {
  try {
    if (!ready()) return;
    let q = db.from("browser_push_subscriptions").select("id,subscription").eq("role", role).eq("enabled", true);
    if (role === "admin") q = q.is("profile_id", null);
    const { data, error } = await q;
    if (error) { console.error("Browser push role lookup failed:", error.message); return; }
    await deliver(db, data || [], payload);
  } catch (e) { console.error("Browser push delivery skipped:", e.message); }
}
exports.notifyProfile = notifyProfile;
exports.notifyRole = notifyRole;
exports.handler = async event => {
  try {
    const user = await userFrom(event);
    if (!user) return json(401, { error: "Please sign in to enable browser notifications." });
    const db = admin(), adminUser = await isAdmin(user);
    let role = "admin";
    if (!adminUser) {
      const { data: profile, error } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (error) throw error;
      role = String(profile?.role || "").toLowerCase();
      if (!["parent", "teacher"].includes(role)) return json(403, { error: "Browser notifications are available for parent, teacher and administrator accounts." });
    }
    if (event.httpMethod === "GET") return json(200, { enabled: ready(), publicKey: ready() ? vapidPublic() : null });
    if (event.httpMethod === "DELETE") {
      const b = JSON.parse(event.body || "{}"), endpoint = String(b.endpoint || "");
      if (!endpoint.startsWith("https://")) return json(400, { error: "A valid subscription endpoint is required." });
      let q = db.from("browser_push_subscriptions").delete().eq("endpoint", endpoint);
      if (!adminUser) q = q.eq("profile_id", user.id);
      const { error } = await q;
      if (error) throw error;
      return json(200, { ok: true });
    }
    if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });
    if (!ready()) return json(503, { error: "Browser notifications are not configured yet. The school administrator must add the VAPID environment variables." });
    const b = JSON.parse(event.body || "{}"), sub = b.subscription;
    if (!sub?.endpoint?.startsWith("https://") || !sub?.keys?.p256dh || !sub?.keys?.auth) return json(400, { error: "The browser returned an invalid push subscription." });
    const { error } = await db.from("browser_push_subscriptions").upsert({
      endpoint: sub.endpoint, subscription: sub, profile_id: adminUser ? null : user.id,
      role, enabled: true, updated_at: new Date().toISOString()
    }, { onConflict: "endpoint" });
    if (error) throw error;
    return json(201, { ok: true, role });
  } catch (e) {
    console.error("browser-notifications", e);
    return json(500, { error: "Browser notifications could not be configured." });
  }
};
