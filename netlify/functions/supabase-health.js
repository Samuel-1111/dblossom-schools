const { admin } = require("./_supabase");

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  },
  body: JSON.stringify(body)
});

// Reports connection status only. Never returns keys, rows, or database error details.
exports.handler = async event => {
  if (event.httpMethod !== "GET") {
    return json(405, { ok: false, error: "Method Not Allowed" });
  }

  try {
    const db = admin();
    const { error } = await db.from("profiles").select("id").limit(1);
    if (!error) {
      return json(200, { ok: true, configured: true, connected: true, schemaReady: true });
    }

    const missingTable = error.code === "42P01" || error.code === "PGRST205";
    console.error("Supabase health query failed:", error.code || "unknown");
    return json(missingTable ? 200 : 503, {
      ok: missingTable,
      configured: true,
      connected: !missingTable ? false : true,
      schemaReady: false,
      error: missingTable ? "Supabase is reachable, but the required profiles table is missing." : "Supabase connection failed. Check the Vercel server environment variables and Supabase project."
    });
  } catch (error) {
    console.error("Supabase health check failed:", error.message || error);
    return json(503, {
      ok: false,
      configured: false,
      connected: false,
      schemaReady: false,
      error: "Supabase server credentials are missing or invalid. Configure SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in Vercel."
    });
  }
};
