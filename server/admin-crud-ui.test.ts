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
    expect(clientSource).toContain('teacher.staff_id.trim()');
    expect(clientSource).toContain('teacher.assigned_class.trim()');
    expect(clientSource).toContain('teacher.password');
    expect(clientSource).toContain('student.password');
    expect(clientSource).toContain('student.parent_email');
    expect(clientSource).toContain('student.boarding_status');
    expect(clientSource).toContain('mediaForm.category');
    expect(clientSource).toContain('mediaForm.status');
    expect(routeSource).toContain('body.staff_id');
    expect(routeSource).toContain('body.assigned_class');
    expect(routeSource).toContain('body.password');
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
    expect(clientSource).toContain('removeSubject(row)');
    expect(clientSource).toContain('adminRequest("POST", "subjects"');
    expect(clientSource).toContain('module === "payments" || module === "complaints" || module === "subjects"');
    expect(clientSource).toContain('module === "gallery" ? "gallery_images" : module');
    expect(routeSource).toContain('table === "subjects" ? cleanSubjectPayload(body)');
    expect(routeSource).toContain('table === "announcements" ? cleanAnnouncementPayload(body)');
    expect(clientSource).toContain('adminRequest("POST", "announcements"');
    expect(clientSource).toContain('module === "settings" ? "announcements" : module');
    expect(clientSource).toContain('aria-label="Admin mobile modules"');
    expect(clientSource).toContain('pb-24 md:px-8 md:pb-6');
    expect(clientSource).toContain('min-w-[64px]');
    expect(clientSource).toContain('"complaints", "Complaints"');
    expect(routeSource).toContain('table !== "students" && table !== "teachers" && table !== "events" && table !== "gallery_images" && table !== "subjects"');
    expect(clientSource).toContain('saveMedia');
    expect(clientSource).toContain('editMedia("events", row)');
    expect(clientSource).toContain('editMedia("gallery_images", row)');
    expect(clientSource).toContain('Add Event');
    expect(clientSource).toContain('Add Gallery Image');
    expect(clientSource).toContain('Filter students by class');
    expect(clientSource).toContain('Filter results by class');
    expect(clientSource).toContain('Filter results by term');
    expect(clientSource).toContain('studentClassFilter');
    expect(clientSource).toContain('resultTermFilter');
    expect(clientSource).toContain('adminRequest("POST", mediaForm.table, undefined, body)');
    expect(clientSource).toContain('Event title and date are required before uploading.');
    expect(clientSource).toContain('Unable to create the media record before uploading.');
    expect(clientSource).not.toContain('Save the media record before uploading an image.');
    expect(clientSource).toContain('loading="lazy"');
    expect(clientSource).toContain('alt={String(row.title ?? "School media")}');
    expect(clientSource).toContain('columns={["student", "class", "term", "session", "average"]}');
    expect(clientSource).toContain('class: classes.find');
  });

  it("provides Admin result detail and comment review without result creation controls", () => {
    expect(clientSource).toContain("openResult");
    expect(clientSource).toContain('role="dialog"');
    expect(clientSource).toContain("resultSubjects");
    expect(clientSource).toContain("saveResultComments");
    expect(clientSource).toContain("exportStudents");
    expect(clientSource).toContain("exportTeachers");
    expect(clientSource).toContain("exportResults");
    expect(clientSource).toContain('"Full Name", "Admission Number", "Class", "Gender", "Date of Birth", "Parent Name", "Parent Phone", "Parent Email", "Boarding Status", "Password", "Status"');
    expect(clientSource).toContain('"Student Name", "Class", "Term", "Session", "Subject", "CA Score", "Exam Score", "Total", "Grade", "Result Total", "Average", "Overall %", "Position", "Teacher Comment", "Principal Comment"');
    expect(clientSource).toContain("<Eye className=\"h-5 w-5\"");
    expect(clientSource).toContain("<Trash2 className=\"h-5 w-5\"");
    expect(clientSource).toContain("Result uploads are teacher-only");
  });

  it("keeps destructive actions behind explicit browser confirmation", () => {
    expect(clientSource).toContain("Delete student");
    expect(clientSource).toContain("Delete teacher");
    expect(clientSource).toContain("window.confirm");
  });
});
