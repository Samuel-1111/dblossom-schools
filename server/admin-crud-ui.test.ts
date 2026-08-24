import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const clientSource = readFileSync(new URL("../app/admin-dashboard/AdminDashboardClient.tsx", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../app/api/admin/records/route.ts", import.meta.url), "utf8");

describe("Admin CRUD client contract", () => {
  it("provides explicit student edit and delete actions", () => {
    expect(clientSource).toContain('adminRequest("PATCH", "students", String(editingStudentId), payload)');
    expect(clientSource).toContain('adminRequest("DELETE", "students", String(row.id))');
    expect(clientSource).toContain('>Edit</button>');
    expect(clientSource).toContain('>Delete</button>');
  });

  it("provides teacher profile edit and role-scoped delete actions", () => {
    expect(clientSource).toContain('adminRequest("PATCH", "teachers", editingTeacherId, payload)');
    expect(clientSource).toContain('adminRequest("DELETE", "teachers", String(row.id))');
    expect(clientSource).toContain('teacher.email.trim()');
    expect(clientSource).toContain('teacher.phone.trim()');
  });

  it("protects imported-record access with the local admin cookie and server-only client", () => {
    expect(routeSource).toContain("isValidLocalAdminToken");
    expect(routeSource).toContain("createServiceClient");
    expect(routeSource).toContain('table === "students" || table === "teachers" || table === "results" || table === "classes"');
    expect(routeSource).toContain('table === "classes" ? await query.order("name"');
    expect(routeSource).toContain("export async function GET");
    expect(routeSource).toContain("export async function PATCH");
    expect(routeSource).toContain("This Admin table is read-only here");
    expect(routeSource).toContain('table !== "students" && table !== "teachers" && table !== "events" && table !== "gallery_images"');
    expect(clientSource).toContain('removeMedia("events", row)');
    expect(clientSource).toContain('removeMedia("gallery_images", row)');
    expect(clientSource).toContain('updatePaymentStatus(row, "Confirmed")');
    expect(clientSource).toContain('updatePaymentStatus(row, "Rejected")');
    expect(routeSource).toContain('const allowed = table === "payments" ? ["Confirmed", "Rejected", "Pending"] : ["New", "Reviewed", "Resolved"]');
    expect(clientSource).toContain('updateComplaintStatus(row, "Reviewed")');
    expect(clientSource).toContain('updateComplaintStatus(row, "Resolved")');
    expect(routeSource).toContain('table === "payments" || table === "complaints"');
  });

  it("provides Admin result comment review without result creation controls", () => {
    expect(clientSource).toContain("saveResultComments");
    expect(clientSource).toContain("Edit comments");
    expect(clientSource).toContain("Result uploads are teacher-only");
  });

  it("keeps destructive actions behind explicit browser confirmation", () => {
    expect(clientSource).toContain("Delete student");
    expect(clientSource).toContain("Delete teacher");
    expect(clientSource).toContain("window.confirm");
  });
});
