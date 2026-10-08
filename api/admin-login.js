module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const configuredUsername = process.env.ADMIN_USERNAME;
    const configuredPassword = process.env.ADMIN_PASSWORD;

    if (!configuredUsername || !configuredPassword) {
      return res.status(500).json({
        error: "Administrator login is not configured on Vercel.",
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

    if (
      username.toLowerCase() !== configuredUsername.trim().toLowerCase() ||
      password !== configuredPassword
    ) {
      return res.status(401).json({
        error: "Incorrect username or password.",
      });
    }

    return res.status(200).json({
      ok: true,
      verified: true,
    });
  } catch (error) {
    console.error("admin-login", error);
    return res.status(500).json({
      error: "Administrator login could not be completed.",
    });
  }
};
