const handler = require("../netlify/functions/admin-operations").handler;

module.exports = async (req, res) => {
  const event = {
    httpMethod: req.method,
    headers: req.headers || {},
    queryStringParameters: req.query || {},
    body: typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}),
    isBase64Encoded: false
  };

  try {
    const result = await handler(event);
    const headers = result?.headers || {};
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(result?.statusCode || 200).send(result?.body || "");
  } catch (error) {
    console.error("admin-operations", error);
    return res.status(500).json({ error: "Administrator operation could not be completed." });
  }
};
