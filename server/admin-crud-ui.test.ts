import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const clientSource = readFileSync(new URL("../app/admin-dashboard/AdminDashboardClient.tsx", import.meta.url), "utf8");

describe("Admin CRUD client contract", () => {
  it("provides explicit student edit and delete actions", () => {
    expect(clientSource).toContain('supabase.from("students").update(payload).eq("id", editingStudentId)');
    expect(clientSource).toContain('supabase.from("students").delete().eq("id", row.id)');
    expect(clientSource).toContain('>Edit</button>');
    expect(clientSource).toContain('>Delete</button>');
  });

  it("provides teacher profile edit and role-scoped delete actions", () => {
    expect(clientSource).toContain('supabase.from("profiles").update(payload).eq("id", editingTeacherId).eq("role", "teacher")');
    expect(clientSource).toContain('supabase.from("profiles").delete().eq("id", row.id).eq("role", "teacher")');
    expect(clientSource).toContain("Create the Auth account first");
  });

  it("keeps destructive actions behind explicit browser confirmation", () => {
    expect(clientSource).toContain("Delete student");
    expect(clientSource).toContain("Delete teacher");
    expect(clientSource).toContain("window.confirm");
  });
});
