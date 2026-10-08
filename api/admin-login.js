const crypto = require("crypto");

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    "cache-control": "no-store",
  },
  body: JSON.stringify(body),
});

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const createSession = () => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");

  const payload = Buffer.from(
    JSON.stringify({
      role: "admin",
      profileId: "admin-local",
      iat: Date.now(),
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return payload + "." + signature;
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const configuredUsername = process.env.ADMIN_USERNAME;
    const configuredPassword = process.env.ADMIN_PASSWORD;

    if (!configuredUsername || !configuredPassword) {
      return res.status(500).json({
        error: "Administrator verification is not configured.",
      });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return res.status(401).json({
        error: "Username and password are required.",
      });
    }

    const usernameOk = safeEqual(username.toLowerCase(), configuredUsername.trim().toLowerCase());
    const passwordOk = safeEqual(password, configuredPassword);

    if (!usernameOk || !passwordOk) {
      return res.status(401).json({
        error: "Incorrect username or password.",
      });
    }

    return res.status(200).json({
      ok: true,
      session: createSession(),
    });
  } catch (error) {
    console.error("admin-login", error);
    return res.status(500).json({
      error: "Administrator login could not be completed.",
    });
  }
};
