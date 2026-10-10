const path = require("path");

const FUNCTION_NAME = /^[A-Za-z0-9_-]+$/;

module.exports = async function handler(req, res) {
  const name = String(req.query?.name || "");
  if (!FUNCTION_NAME.test(name)) {
    res.status(404).json({ error: "API route not found." });
    return;
  }

  let target;
  try {
    target = path.join(process.cwd(), "netlify", "functions", name + ".js");
    if (!require("fs").existsSync(target)) {
      res.status(404).json({ error: "API route not found." });
      return;
    }

    const mod = require(target);
    if (!mod || typeof mod.handler !== "function") {
      console.error("Vercel adapter: handler missing for", name);
      res.status(500).json({ error: "API handler is not configured." });
      return;
    }

    let rawBody = "";
    if (typeof req.body === "string") rawBody = req.body;
    else if (req.body !== undefined && req.body !== null) rawBody = JSON.stringify(req.body);

    const query = { ...(req.query || {}) };
    delete query.name;
    for (const key of Object.keys(query)) {
      if (Array.isArray(query[key])) query[key] = query[key].join(",");
    }

    const event = {
      httpMethod: req.method,
      headers: req.headers || {},
      body: rawBody || null,
      queryStringParameters: query,
      path: req.url || ("/api/" + name),
      rawUrl: req.url || ("/api/" + name),
    };

    const result = await mod.handler(event, {});
    const status = Number(result && result.statusCode) || 200;
    const headers = (result && result.headers) || {};
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) res.setHeader(key, value);
    }
    res.status(status);
    const body = result && result.body;
    if (body === undefined || body === null) res.end("");
    else res.send(body);
  } catch (error) {
    console.error("Vercel API adapter failure:", name, error);
    res.status(500).json({ error: "The API request failed. Check the Vercel function logs." });
  }
};
