const crypto = require("crypto");

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  return res.status(status).json(body);
}

function getBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return JSON.parse(typeof req.body === "string" ? req.body : "{}");
  } catch {
    return {};
  }
}

function createSession(username) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD is not configured in Vercel.");
  const payload = Buffer.from(JSON.stringify({
    role: "admin",
    username,
    profileId: "admin-local",
    iat: Date.now()
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return payload + "." + signature;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method Not Allowed" });
  }

  try {
    const configuredUsername = String(process.env.ADMIN_USERNAME || "").trim();
    const configuredPassword = String(process.env.ADMIN_PASSWORD || "");

    if (!configuredUsername || !configuredPassword) {
      return json(res, 500, {
        error: "Administrator login is not configured. Add ADMIN_USERNAME and ADMIN_PASSWORD to the Vercel Production environment, then redeploy."
      });
    }

    const body = getBody(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return json(res, 400, { error: "Username and password are required." });
    }

    const usernameMatch = crypto.timingSafeEqual(
      Buffer.from(username.toLowerCase()),
      Buffer.from(configuredUsername.toLowerCase())
    );

    const passwordMatch = crypto.timingSafeEqual(
      Buffer.from(password),
      Buffer.from(configuredPassword)
    );

    if (!usernameMatch || !passwordMatch) {
      return json(res, 401, { error: "Incorrect username or password." });
    }

    const session = createSession(configuredUsername);
    return json(res, 200, { ok: true, verified: true, session });
  } catch (error) {
    console.error("admin-login:", error);
    return json(res, 500, {
      error: error && error.message
        ? error.message
        : "Administrator login could not be completed."
    });
  }
};
