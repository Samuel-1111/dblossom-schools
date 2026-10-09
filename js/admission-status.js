const form = document.querySelector("#admission-status-form");
const result = document.querySelector("#admission-status-result");

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

form?.addEventListener("submit", async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const applicationNumber = String(new FormData(form).get("application_number") || "").trim();
  if (!applicationNumber) return;

  button.disabled = true;
  result.innerHTML = '<p class="notice">Checking admission status…</p>';

  try {
    const query = new URLSearchParams({ application_number: applicationNumber });
    const response = await fetch("/api/admission-status?" + query.toString(), {
      cache: "no-store",
      headers: { "accept": "application/json" }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Unable to check admission status.");

    const data = payload.data || {};
    const status = String(data.status || "Unknown");
    const normalized = status.toLowerCase();
    const approved = normalized === "approved";
    const rejected = normalized === "rejected";
    const statusClass = approved ? "approved" : "pending";
    result.innerHTML = '<div class="status-result-card ' + statusClass + '">' +
      '<div class="section-head"><div><p class="section-label">Admission Status</p><h2>' +
      escapeHtml(status) + '</h2><p class="muted">Admission Number: ' +
      escapeHtml(data.application_number || applicationNumber) + '</p></div></div>' +
      (approved
        ? '<p class="notice success">Your application has been approved. Please contact the school for the next steps.</p>'
        : rejected
          ? '<p class="notice danger">Please contact the school if you need further information about this application.</p>'
          : '<p class="notice">Your application is not yet approved. Please check again later or contact the school for assistance.</p>') +
      (data.interview_date ? '<p class="muted">Interview date: ' + escapeHtml(data.interview_date) + '</p>' : '') +
      '</div>';
  } catch (error) {
    result.innerHTML = '<p class="notice danger">' + escapeHtml(error.message || "Unable to check admission status.") + '</p>';
  } finally {
    button.disabled = false;
  }
});
