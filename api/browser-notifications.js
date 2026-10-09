const handler = require("../netlify/functions/browser-notifications").handler;
module.exports = async (req, res) => {
  const event = { httpMethod: req.method, headers: req.headers || {}, queryStringParameters: req.query || {}, body: typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}), isBase64Encoded: false };
  try {
    const r = await handler(event);
    Object.entries(r.headers || {}).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(r.statusCode || 200).send(r.body || "");
  } catch (e) {
    console.error("browser-notifications", e);
    return res.status(500).json({ error: "Browser notifications failed." });
  }
};
