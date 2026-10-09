(function () {
  "use strict";

  const sections = [
    { id: "overview", label: "Dashboard Overview", table: null },
    { id: "students", label: "Students", table: "students" },
    { id: "teachers", label: "Teachers", table: "teachers" },
    { id: "results", label: "Results", table: "results" },
    { id: "parents", label: "Parents", table: "parents" },
    { id: "payments", label: "Payments", table: "fee_payments" },
    { id: "events", label: "Events", table: "events" },
    { id: "gallery", label: "Gallery", table: "gallery_images" },
    { id: "contact", label: "Contact Enquiries", table: "contact_messages" },
    { id: "admissions", label: "Admissions", table: "admission_applications" },
    { id: "messages", label: "Parent Messages", table: "parent_messages" },
    { id: "subjects", label: "Subjects", table: "subjects" },
    { id: "advanced", label: "School Management / Advanced", table: null },
    { id: "settings", label: "Settings", table: null }
  ];

  const side = document.getElementById("admin-sidebar");
  const mobile = document.getElementById("admin-mobile-nav");
  const main = document.getElementById("admin-main");
  let dashboardStats = null;

  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));

  async function request(url, options) {
    const response = await fetch(url, Object.assign({
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Accept": "application/json" }
    }, options || {}));
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
    if (!response.ok) {
      throw new Error(data.error || ("Request failed (HTTP " + response.status + ")."));
    }
    return data;
  }

  function card(title, body) {
    return '<section class="portal-empty-card"><p class="section-label">D’Blossom Administrator Portal</p><h2>' +
      esc(title) + '</h2>' + body + '</section>';
  }

  function statCard(label, value) {
    return '<article class="portal-stat-card"><span>' + esc(label) + '</span><strong>' +
      esc(value) + '</strong></article>';
  }

  function money(value) {
    return "₦" + Number(value || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 });
  }

  function makeNav(section) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.section = section.id;
    button.textContent = section.label;
    button.addEventListener("click", () => openSection(section.id));
    return button;
  }

  sections.forEach(section => {
    side.appendChild(makeNav(section));
    mobile.appendChild(makeNav(section));
  });

  function markActive(id) {
    document.querySelectorAll("[data-section]").forEach(button => {
      button.classList.toggle("active", button.dataset.section === id);
    });
  }

  function table(headers, rows) {
    if (!rows.length) return '<p class="portal-muted">No records were returned for this section.</p>';
    return '<div class="portal-table-wrap"><table class="data-table"><thead><tr>' +
      headers.map(header => '<th>' + esc(header) + '</th>').join("") +
      '</tr></thead><tbody>' + rows.map(row => '<tr>' +
        row.map(value => '<td>' + esc(value == null || value === "" ? "—" : value) + '</td>').join("") +
      '</tr>').join("") + '</tbody></table></div>';
  }

  function date(value) {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  }

  function rowValue(row, relation, field) {
    let value = row;
    for (const key of relation.split(".")) value = value && value[key];
    return value == null ? "—" : value;
  }

  const tableViews = {
    students: { title: "Students", columns: ["Full name", "Admission number", "Class", "Status"], rows: x => [x.full_name, x.admission_number, x.class_name, x.status] },
    teachers: { title: "Teachers", columns: ["Full name", "Staff ID", "Class", "Subject", "Status"], rows: x => [x.full_name, x.staff_id, x.class_name || x.assigned_class, x.subject_name || x.subject, x.status] },
    results: { title: "Results", columns: ["Student", "Admission number", "Subject", "Term", "CA", "Exam", "Total", "Grade"], rows: x => [rowValue(x, "students.full_name"), rowValue(x, "students.admission_number"), rowValue(x, "subjects.name"), rowValue(x, "terms.name"), x.ca_score, x.exam_score, x.total_score, x.grade] },
    parents: { title: "Parents", columns: ["Name", "Email", "Phone", "Status", "Linked children"], rows: x => [x.full_name, x.email, x.phone, x.status, (x.children || []).length] },
    fee_payments: { title: "Payments", columns: ["Reference", "Student", "Admission number", "Amount", "Method", "Status", "Paid on"], rows: x => [x.reference, rowValue(x, "students.full_name"), rowValue(x, "students.admission_number"), money(x.amount), x.method, x.status, date(x.paid_at)] },
    events: { title: "Events", columns: ["Title", "Event date", "Category", "Status"], rows: x => [x.title, date(x.event_date || x.date), x.category, x.status] },
    gallery_images: { title: "Gallery", columns: ["Title", "Category", "Alt text", "Image URL"], rows: x => [x.title, x.category, x.alt_text, x.image_url] },
    contact_messages: { title: "Contact Enquiries", columns: ["Name", "Subject", "Email", "Message", "Status", "Received"], rows: x => [x.name, x.subject, x.email, x.message, x.status, date(x.created_at)] },
    admission_applications: { title: "Admissions", columns: ["Applicant", "Application number", "Class applied", "Parent / guardian", "Status", "Submitted"], rows: x => [x.applicant_name || x.full_name || x.student_name, x.application_number, x.class_applied, x.parent_name, x.status, date(x.created_at)] },
    parent_messages: { title: "Parent Messages", columns: ["Parent", "Student", "Subject", "Message", "Read", "Sent"], rows: x => [rowValue(x, "parent_profiles.full_name"), rowValue(x, "students.full_name"), x.subject, x.body, x.read_at ? "Read" : "Unread", date(x.created_at)] },
    subjects: { title: "Subjects", columns: ["Subject", "Class"], rows: x => [x.name, x.class_name] }
  };

  async function loadOverview() {
    main.innerHTML = card("Dashboard Overview", '<p>Loading school records from the secure server…</p>');
    try {
      const data = await request("/api/dashboard-data");
      dashboardStats = data.stats || {};
      const stats = dashboardStats;
      main.innerHTML = '<section class="portal-empty-card"><div class="portal-section-heading"><div><p class="section-label">Live school data</p><h2>Dashboard Overview</h2><p class="portal-muted">Statistics are retrieved server-side using the Supabase credentials configured in Vercel.</p></div><button class="btn navy-btn" id="refresh-overview" type="button">Refresh data</button></div>' +
        '<div class="portal-stats-grid">' +
        statCard("Students", stats.students || 0) +
        statCard("Teachers", stats.teachers || 0) +
        statCard("Parents", stats.parents || 0) +
        statCard("Results", stats.results || 0) +
        statCard("Announcements", stats.announcements || 0) +
        statCard("Outstanding fees", money(stats.balance)) +
        '</div><h3>School management</h3><p>Use the navigation to review students, teachers, results, parents, payments, events, gallery, contact enquiries, admissions, parent messages, subjects and advanced school settings.</p><p class="portal-muted">Last loaded: ' + esc(new Date().toLocaleString()) + '</p></section>';
      document.getElementById("refresh-overview").addEventListener("click", loadOverview);
    } catch (error) {
      main.innerHTML = card("Dashboard Overview",
        '<div class="portal-error"><strong>Dashboard is open, but live statistics could not be loaded.</strong><p>' +
        esc(error.message) + '</p><button class="btn navy-btn" type="button" id="retry-overview">Retry loading data</button></div>' +
        '<p class="portal-muted">The administrator login is kept intact. Check that SUPABASE_URL and SUPABASE_SECRET_KEY are set in Vercel Production and that the latest deployment is ready.</p>');
      document.getElementById("retry-overview").addEventListener("click", loadOverview);
    }
  }

  async function loadTableSection(section) {
    const config = tableViews[section.table];
    main.innerHTML = card(config.title, '<p>Loading records…</p>');
    const data = await request("/api/admin-operations?table=" + encodeURIComponent(section.table) + "&page=1&pageSize=100");
    const rows = Array.isArray(data.data) ? data.data : [];
    main.innerHTML = '<section class="portal-empty-card"><div class="portal-section-heading"><div><p class="section-label">School records</p><h2>' +
      esc(config.title) + '</h2><p class="portal-muted">' + esc(rows.length) + ' record(s) loaded' +
      (data.count != null && Number(data.count) > rows.length ? ' · ' + esc(data.count) + ' total records' : '') +
      '</p></div><button class="btn navy-btn" type="button" id="refresh-section">Refresh</button></div>' +
      table(config.columns, rows.map(config.rows)) + '</section>';
    document.getElementById("refresh-section").addEventListener("click", () => openSection(section.id));
  }

  async function loadAdvanced() {
    main.innerHTML = card("School Management / Advanced",
      '<div class="portal-feature-grid">' +
      '<article><h3>Academic Sessions</h3><p>Review and manage academic sessions.</p><button class="btn btn-outline" data-advanced-table="sessions">View sessions</button></article>' +
      '<article><h3>Terms</h3><p>Review active and previous terms.</p><button class="btn btn-outline" data-advanced-table="terms">View terms</button></article>' +
      '<article><h3>Classes</h3><p>Review classes configured for the school.</p><button class="btn btn-outline" data-advanced-table="classes">View classes</button></article>' +
      '</div><p class="portal-muted">Advanced operations that change academic records should only be enabled through their secure, supported server endpoints.</p>');
    main.querySelectorAll("[data-advanced-table]").forEach(button => button.addEventListener("click", async () => {
      const name = button.dataset.advancedTable;
      main.innerHTML = card("Loading " + name, "<p>Loading…</p>");
      try {
        const data = await request("/api/admin-operations?table=" + encodeURIComponent(name));
        const rows = data.data || [];
        const columns = name === "sessions" ? ["Academic session", "Active"] : name === "terms" ? ["Term", "Session", "Active"] : ["Class", "Active"];
        main.innerHTML = card(name.charAt(0).toUpperCase() + name.slice(1), table(columns, rows.map(x =>
          name === "sessions" ? [x.name, x.is_active ? "Yes" : "No"] :
          name === "terms" ? [x.name, rowValue(x, "academic_sessions.name"), x.is_active ? "Yes" : "No"] :
          [x.name, x.is_active ? "Yes" : "No"])));
      } catch (error) {
        main.innerHTML = card(name, '<div class="portal-error">' + esc(error.message) + '</div>');
      }
    }));
  }

  async function openSection(id) {
    const section = sections.find(item => item.id === id);
    if (!section) return;
    markActive(id);
    if (id === "overview") return loadOverview();
    if (id === "advanced") return loadAdvanced();
    if (id === "settings") {
      main.innerHTML = card("Settings",
        '<h3>Administrator access</h3><p>The administrator username and password are verified by the Vercel server. They are not stored in this page.</p>' +
        '<h3>Database connection</h3><p>School data is fetched by protected server endpoints using the Supabase environment variables configured in Vercel. Secret keys are never placed in browser JavaScript.</p>' +
        '<button class="btn navy-btn" type="button" id="settings-refresh">Refresh dashboard data</button>');
      document.getElementById("settings-refresh").addEventListener("click", () => openSection("overview"));
      return;
    }
    try {
      await loadTableSection(section);
    } catch (error) {
      main.innerHTML = card(section.label,
        '<div class="portal-error"><strong>This section could not load its records.</strong><p>' +
        esc(error.message) + '</p><button class="btn navy-btn" type="button" id="retry-section">Try again</button></div>');
      document.getElementById("retry-section").addEventListener("click", () => openSection(id));
    }
  }

  document.getElementById("admin-logout").addEventListener("click", async function () {
    this.disabled = true;
    try {
      await fetch("/api/admin-login", { method: "DELETE", credentials: "same-origin", cache: "no-store" });
    } finally {
      location.replace("/admin/");
    }
  });

  async function boot() {
    main.innerHTML = card("Opening administrator dashboard", "<p>Checking your secure login session…</p>");
    try {
      const session = await request("/api/admin-login");
      if (session.authenticated !== true) {
        main.innerHTML = card("Administrator session not detected",
          '<div class="portal-error"><p>Your login session was not received by this page.</p><a class="btn navy-btn" href="/admin/">Return to Admin Login</a></div>');
        return;
      }
      await loadOverview();
    } catch (error) {
      main.innerHTML = card("Dashboard connection issue",
        '<div class="portal-error"><p>' + esc(error.message) + '</p><button class="btn navy-btn" type="button" id="retry-boot">Retry</button></div>');
      document.getElementById("retry-boot").addEventListener("click", boot);
    }
  }

  boot();
})();