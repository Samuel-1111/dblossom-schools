const crypto = require("crypto");

const COOKIE = "dblossom_admin_session";
const MAX_AGE = 12 * 60 * 60;

function json(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Vary", "Cookie");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  return res.json(body);
}

function getBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(typeof req.body === "string" ? req.body : "{}"); }
  catch { return {}; }
}

function secret() {
  const value = String(process.env.ADMIN_PASSWORD || "");
  if (!value) throw new Error("ADMIN_PASSWORD is not configured in Vercel.");
  return value;
}

function createSession(username) {
  const payload = Buffer.from(JSON.stringify({
    role: "admin",
    username,
    profileId: "admin-local",
    iat: Date.now()
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return payload + "." + signature;
}

function verifySession(token) {
  if (!token) return null;
  const parts = String(token).split(".");
  if (parts.length !== 2) return null;
  const expected = crypto.createHmac("sha256", secret()).update(parts[0]).digest("hex");
  const actual = parts[1];
  if (actual.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (data.role !== "admin" || !data.username || !data.iat) return null;
    if (Date.now() - Number(data.iat) > MAX_AGE * 1000) return null;
    return data;
  } catch { return null; }
}

function cookies(req) {
  const raw = String(req.headers?.cookie || req.headers?.Cookie || "");
  return raw.split(";").reduce((out, part) => {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    return out;
  }, {});
}

function setSessionCookie(res, value) {
  res.setHeader("Set-Cookie",
    COOKIE + "=" + encodeURIComponent(value) +
    "; Max-Age=" + MAX_AGE +
    "; Path=/" +
    "; HttpOnly" +
    "; SameSite=Lax" +
    (process.env.NODE_ENV === "production" ? "; Secure" : "")
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", COOKIE + "=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax" +
    (process.env.NODE_ENV === "production" ? "; Secure" : ""));
}

function configured() {
  return Boolean(String(process.env.ADMIN_USERNAME || "").trim() && String(process.env.ADMIN_PASSWORD || ""));
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      if (!configured()) return json(res, 500, {
        ok: false,
        configured: false,
        error: "Administrator login is not configured in Vercel Production."
      });
      const session = verifySession(cookies(req)[COOKIE]);
      return json(res, 200, {
        ok: true,
        endpoint: "admin-login",
        configured: true,
        authenticated: Boolean(session),
        username: session ? session.username : undefined
      });
    }

    if (req.method === "DELETE") {
      clearSessionCookie(res);
      return json(res, 200, { ok: true, loggedOut: true });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST, DELETE");
      return json(res, 405, { error: "Method Not Allowed" });
    }

    const configuredUsername = String(process.env.ADMIN_USERNAME || "").trim();
    const configuredPassword = String(process.env.ADMIN_PASSWORD || "");
    if (!configuredUsername || !configuredPassword) {
      return json(res, 500, {
        error: "Administrator login is not configured. Add ADMIN_USERNAME and ADMIN_PASSWORD to Vercel Production, then redeploy."
      });
    }

    const body = getBody(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) return json(res, 400, {
      error: "Username and password are required."
    });

    const hash = value => crypto.createHash("sha256").update(String(value)).digest();
    const usernameMatch = crypto.timingSafeEqual(hash(username.toLowerCase()), hash(configuredUsername.toLowerCase()));
    const passwordMatch = crypto.timingSafeEqual(hash(password), hash(configuredPassword));

    if (!usernameMatch || !passwordMatch) {
      return json(res, 401, { error: "Incorrect username or password." });
    }

    setSessionCookie(res, createSession(configuredUsername));
    return json(res, 200, { ok: true, verified: true });
  } catch (error) {
    console.error("admin-login:", error);
    return json(res, 500, {
      error: error?.message || "Administrator login could not be completed."
    });
  }
};