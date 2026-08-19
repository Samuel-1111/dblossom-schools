import { describe, expect, it } from "vitest";
import { canTeacherUploadResult, isAdminSession } from "./routers";
import { isAdminRegistrationFormOpen } from "../shared/school";

describe("admin session authorization", () => {
  it("accepts a platform admin session", () => {
    expect(isAdminSession("", "admin")).toBe(true);
  });

  it("accepts the local administrator cookie", () => {
    expect(isAdminSession("local_admin=1", null)).toBe(true);
  });

  it("rejects ordinary and anonymous sessions", () => {
    expect(isAdminSession("", "user")).toBe(false);
    expect(isAdminSession("", null)).toBe(false);
    expect(isAdminSession("session=abc", undefined)).toBe(false);
  });

  it("allows result uploads only for a class teacher in the assigned class", () => {
    expect(canTeacherUploadResult("Class Teacher", "JSS1", "JSS1")).toBe(true);
    expect(canTeacherUploadResult("Class Teacher", "JSS1", "JSS2")).toBe(false);
    expect(canTeacherUploadResult("Teaching Staff", "JSS1", "JSS1")).toBe(false);
    expect(canTeacherUploadResult("Class Teacher", "", "JSS1")).toBe(false);
  });

  it("opens registration forms only for add or edit mode", () => {
    expect(isAdminRegistrationFormOpen(null, false)).toBe(false);
    expect(isAdminRegistrationFormOpen(null, true)).toBe(true);
    expect(isAdminRegistrationFormOpen(42, false)).toBe(true);
  });
});

