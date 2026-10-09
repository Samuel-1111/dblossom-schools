const { admin } = require("./_supabase");

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    "cache-control": "no-store"
  },
  body: JSON.stringify(body)
});

exports.handler = async event => {
  try {
    const applicationNumber = String(event.queryStringParameters?.application_number || "").trim();
    if (!applicationNumber) {
      return json(400, { error: "Admission number is required." });
    }

    // Return status-only data. Do not expose applicant or guardian personal details
    // through an endpoint that is intentionally accessible with an admission number alone.
    const { data, error } = await admin()
      .from("admission_applications")
      .select("application_number,status,interview_date,updated_at")
      .eq("application_number", applicationNumber)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json(404, { error: "Admission number not found. Please check it and try again." });

    return json(200, { data });
  } catch (error) {
    return json(500, { error: "Unable to check admission status right now. Please try again later." });
  }
};
