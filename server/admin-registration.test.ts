import { describe, expect, it } from "vitest";
import { hasValidationErrors, validateStudentRegistration, validateTeacherRegistration } from "../shared/school";

describe("administrator registration validation", () => {
  it("requires the core student fields and a password for new records", () => {
    const errors = validateStudentRegistration({ fullName: "", admissionNumber: "", className: "", password: "" });
    expect(errors).toEqual({
      fullName: "Full name is required.",
      admissionNumber: "Admission number is required.",
      className: "Class is required.",
      password: "Password is required for a new student.",
    });
    expect(hasValidationErrors(errors)).toBe(true);
  });

  it("allows an existing student to keep its password unchanged", () => {
    expect(validateStudentRegistration({ fullName: "Ada Blossom", admissionNumber: "DB-001", className: "JSS1" }, true)).toEqual({});
  });

  it("requires teacher identity fields and a password for new records", () => {
    expect(validateTeacherRegistration({ fullName: "", staffId: "", password: "" })).toEqual({
      fullName: "Full name is required.",
      staffId: "Staff ID is required.",
      password: "Password is required for a new teacher.",
    });
  });

  it("allows an existing teacher to keep its password unchanged", () => {
    expect(validateTeacherRegistration({ fullName: "Grace Blossom", staffId: "ST-001" }, true)).toEqual({});
  });
});
