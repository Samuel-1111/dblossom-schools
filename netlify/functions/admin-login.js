const crypto = require("crypto");
const { limiter, clientIp } = require("./_supabase");

const COOKIE = "dblossom_admin_session";
const MAX_AGE = 12 * 60 * 60;
const secure = () => (process.env.NODE_ENV === "production" ? "; Secure" : "");

const json = (statusCode, body, extra = {}) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    pragma: "no-cache",
    expires: "0",
    vary: "Cookie",
    ...extra
  },
  body: JSON.stringify(body)
});

const configured = () =>
  Boolean(String(process.env.ADMIN_USERNAME || "").trim() && String(process.env.ADMIN_PASSWORD || ""));

function secret() {
  const value = String(process.env.ADMIN_PASSWORD || "");
  if (!value) throw new Error("ADMIN_PASSWORD is not configured in Vercel.");
  return value;
}

function createSession(username) {
  const payload = Buffer.from(JSON.stringify({
    role: "admin", username, profileId: "admin-local", iat: Date.now()
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return payload + "." + signature;
}

function verifySession(token) {
  if (!token) return null;
  const parts = String(token).split(".");
  if (parts.length !== 2) return null;
  const expected = crypto.createHmac("sha256", secret()).update(parts[0]).digest("hex");
  if (parts[1].length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (data.role !== "admin" || !data.username || !data.iat) return null;
    if (Date.now() - Number(data.iat) > MAX_AGE * 1000) return null;
    return data;
  } catch { return null; }
}

function cookies(event) {
  const raw = String(event.headers?.cookie || event.headers?.Cookie || "");
  return raw.split(";").reduce((out, part) => {
    const i = part.indexOf("=");
    if (i > -1) {
      try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
      catch { /* ignore malformed cookie */ }
    }
    return out;
  }, {});
}

exports.handler = async event => {
  try {
    if (event.httpMethod === "GET") {
      if (!configured()) return json(500, {
        ok: false, configured: false,
        error: "Administrator login is not configured in Vercel Production."
      });
      const session = verifySession(cookies(event)[COOKIE]);
      return json(200, {
        ok: true, endpoint: "admin-login", configured: true,
        authenticated: Boolean(session),
        username: session ? session.username : undefined
      });
    }

    if (event.httpMethod === "DELETE") {
      return json(200, { ok: true, loggedOut: true }, {
        "set-cookie": COOKIE + "=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax" + secure()
      });
    }

    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method Not Allowed" }, { allow: "GET, POST, DELETE" });
    }

    const configuredUsername = String(process.env.ADMIN_USERNAME || "").trim();
    const configuredPassword = String(process.env.ADMIN_PASSWORD || "");
    if (!configuredUsername || !configuredPassword) {
      return json(500, { error: "Administrator login is not configured. Add ADMIN_USERNAME and ADMIN_PASSWORD to Vercel Production, then redeploy." });
    }

    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password) return json(400, { error: "Username and password are required." });

    const key = "admin:" + username.toLowerCase() + ":" + clientIp(event);
    if (limiter.blocked(key)) return json(429, { error: "Too many attempts. Please wait 15 minutes and try again." });

    const hash = value => crypto.createHash("sha256").update(String(value)).digest();
    const userOk = crypto.timingSafeEqual(hash(username.toLowerCase()), hash(configuredUsername.toLowerCase()));
    const passOk = crypto.timingSafeEqual(hash(password), hash(configuredPassword));
    if (!userOk || !passOk) {
      limiter.fail(key);
      return json(401, { error: "Incorrect username or password." });
    }

    limiter.clear(key);
    return json(200, { ok: true, verified: true }, {
      "set-cookie": COOKIE + "=" + encodeURIComponent(createSession(configuredUsername)) +
        "; Max-Age=" + MAX_AGE + "; Path=/; HttpOnly; SameSite=Lax" + secure()
    });
  } catch (error) {
    console.error("admin-login:", error);
    return json(500, { error: error?.message || "Administrator login could not be completed." });
  }
};
