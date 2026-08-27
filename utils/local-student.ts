import { jwtVerify, SignJWT } from "jose";

export const LOCAL_STUDENT_COOKIE = "local_student_session";

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for local student sessions");
  return new TextEncoder().encode(secret);
}

export async function createLocalStudentToken(admissionNumber: string, fullName: string) {
  return new SignJWT({ role: "student", admission_number: admissionNumber, full_name: fullName })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(`student:${admissionNumber}`)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function getLocalStudentSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.role !== "student" || typeof payload.admission_number !== "string") return null;
    return { admissionNumber: payload.admission_number, fullName: typeof payload.full_name === "string" ? payload.full_name : "Student" };
  } catch {
    return null;
  }
}
