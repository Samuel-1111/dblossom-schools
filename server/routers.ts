import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { complaints, payments, results } from "../drizzle/schema";
import { getDb, findStudentsByAdmission, findTeachersByStaffId, findStudent, findTeacher, getSchoolAdminSnapshot, listPublicContent, listResultsForStudent } from "./db";
import { notifyOwner } from "./_core/notification";
import { calculateSubjects, summarizeSubjects } from "../shared/school";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";

const localAdminProcedure = publicProcedure.use(({ ctx, next }) => {
  const cookieHeader = String(ctx.req.headers.cookie ?? "");
  const isLocalAdmin = cookieHeader.split(";").some((part) => part.trim() === "local_admin=1");
  if (!isLocalAdmin) throw new TRPCError({ code: "UNAUTHORIZED", message: "Local administrator login required" });
  return next();
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  publicContent: publicProcedure.query(() => listPublicContent()),
  studentPortal: router({
    login: publicProcedure.input(z.object({ admissionNumber: z.string().min(1), password: z.string().min(1) })).mutation(async ({ input }) => {
      const matches = await findStudentsByAdmission(input.admissionNumber.trim());
      if (!matches.length) return { ok: false as const, reason: "not_found" as const };
      const student = matches.find((item) => item.password === input.password);
      if (!student) return { ok: false as const, reason: "incorrect_password" as const };
      return { ok: true as const, student: { id: student.id, fullName: student.fullName, admissionNumber: student.admissionNumber, className: student.className } };
    }),
    results: publicProcedure.input(z.object({ studentId: z.number(), term: z.string().optional(), session: z.string().optional() })).query(({ input }) => listResultsForStudent(input.studentId, input.term, input.session)),
  }),
  teacherPortal: router({
    login: publicProcedure.input(z.object({ staffId: z.string().min(1), password: z.string().min(1) })).mutation(async ({ input }) => {
      const matches = await findTeachersByStaffId(input.staffId.trim());
      if (!matches.length) return { ok: false as const, reason: "not_found" as const };
      const teacher = matches.find((item) => item.password === input.password);
      if (!teacher) return { ok: false as const, reason: "incorrect_password" as const };
      return { ok: true as const, teacher: { id: teacher.id, fullName: teacher.fullName, staffId: teacher.staffId, role: teacher.role, assignedClass: teacher.assignedClass } };
    }),
    classStudents: publicProcedure.input(z.object({ className: z.string().min(1) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { students } = await import("../drizzle/schema");
      return db.select().from(students).where((await import("drizzle-orm")).and((await import("drizzle-orm")).eq(students.className, input.className), (await import("drizzle-orm")).eq(students.status, "Active"))).orderBy(students.fullName);
    }),
    viewResults: publicProcedure.input(z.object({ className: z.string().optional(), term: z.string().optional(), session: z.string().optional() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const filters = [];
      if (input.className) filters.push((await import("drizzle-orm")).eq(results.className, input.className));
      if (input.term) filters.push((await import("drizzle-orm")).eq(results.term, input.term));
      if (input.session) filters.push((await import("drizzle-orm")).eq(results.session, input.session));
      return db.select().from(results).where(filters.length ? (await import("drizzle-orm")).and(...filters) : undefined).limit(100);
    }),
    saveResult: publicProcedure.input(z.object({ teacherRole: z.string(), studentId: z.number(), studentName: z.string(), className: z.string(), term: z.string(), session: z.string(), subjects: z.array(z.object({ name: z.string(), caScore: z.number(), examScore: z.number() })), teacherComment: z.string().optional(), principalComment: z.string().optional() })).mutation(async ({ input }) => {
      if (input.teacherRole !== "Class Teacher") throw new Error("Only class teachers can save results");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const subjects = calculateSubjects(input.subjects);
      const { totalScore, average } = summarizeSubjects(subjects);
      const existing = await listResultsForStudent(input.studentId, input.term, input.session);
      const payload = { studentId: input.studentId, studentName: input.studentName, className: input.className, term: input.term, session: input.session, subjectsJson: JSON.stringify(subjects), totalScore, average: Math.round(average), overallPercentage: Math.round(average), teacherComment: input.teacherComment ?? null, principalComment: input.principalComment ?? null };
      if (existing[0]) await db.update(results).set(payload).where((await import("drizzle-orm")).eq(results.id, existing[0].id));
      else await db.insert(results).values(payload);
      return { totalScore, average, subjects };
    }),
  }),
  publicForms: router({
    payment: publicProcedure.input(z.object({ studentName: z.string().min(2), className: z.string().min(2), amount: z.number().positive() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.insert(payments).values({ ...input, paymentDate: new Date().toISOString().slice(0, 10) });
      return { whatsappNumber: process.env.SCHOOL_WHATSAPP_NUMBER ?? "", message: "Payment notification received. Please send your proof of payment to the school WhatsApp number." };
    }),
    complaint: publicProcedure.input(z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().optional(), subject: z.string().min(2), message: z.string().min(10) })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.insert(complaints).values(input);
      const sent = await notifyOwner({ title: `New school enquiry: ${input.subject}`, content: `${input.name} (${input.email})\n\n${input.message}` });
      return { sent };
    }),
  }),
  admin: router({
    createStudent: localAdminProcedure.input(z.object({ fullName: z.string().min(2), admissionNumber: z.string().min(1), className: z.string().min(2), password: z.string().min(1), gender: z.enum(["Male", "Female"]).optional(), dateOfBirth: z.string().optional(), parentName: z.string().optional(), parentPhone: z.string().optional(), parentEmail: z.string().email().optional(), boardingStatus: z.enum(["Day", "Boarding"]).optional(), status: z.enum(["Active", "Inactive"]).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { students } = await import("../drizzle/schema");
      const existing = await findStudentsByAdmission(input.admissionNumber.trim());
      if (existing.length) throw new Error("Admission number already exists");
      await db.insert(students).values(input);
      return { success: true };
    }),
    updateStudent: localAdminProcedure.input(z.object({ id: z.number(), admissionNumber: z.string().min(1).optional(), fullName: z.string().min(2).optional(), className: z.string().min(2).optional(), gender: z.enum(["Male", "Female"]).optional(), dateOfBirth: z.string().optional(), parentName: z.string().optional(), parentPhone: z.string().optional(), parentEmail: z.string().email().optional(), boardingStatus: z.enum(["Day", "Boarding"]).optional(), password: z.string().min(1).optional(), status: z.enum(["Active", "Inactive"]).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { students } = await import("../drizzle/schema");
      const { id, ...changes } = input;
      if (input.admissionNumber) {
        const duplicate = (await findStudentsByAdmission(input.admissionNumber.trim())).some((student) => student.id !== id);
        if (duplicate) throw new Error("Admission number already exists");
      }
      await db.update(students).set(changes).where((await import("drizzle-orm")).eq(students.id, id));
      return { success: true };
    }),
    deleteStudent: localAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { students } = await import("../drizzle/schema");
      await db.delete(students).where((await import("drizzle-orm")).eq(students.id, input.id));
      return { success: true };
    }),
    createTeacher: localAdminProcedure.input(z.object({ fullName: z.string().min(2), staffId: z.string().min(1), password: z.string().min(1), role: z.enum(["Class Teacher", "Teaching Staff"]), assignedClass: z.string().optional(), subject: z.string().optional(), email: z.string().email().optional(), phone: z.string().optional(), status: z.enum(["Active", "Inactive"]).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { teachers } = await import("../drizzle/schema");
      const existing = await findTeachersByStaffId(input.staffId.trim());
      if (existing.length) throw new Error("Staff ID already exists");
      await db.insert(teachers).values(input);
      return { success: true };
    }),
    updateTeacher: localAdminProcedure.input(z.object({ id: z.number(), staffId: z.string().min(1).optional(), fullName: z.string().min(2).optional(), role: z.enum(["Class Teacher", "Teaching Staff"]).optional(), assignedClass: z.string().optional(), subject: z.string().optional(), email: z.string().email().optional(), phone: z.string().optional(), password: z.string().min(1).optional(), status: z.enum(["Active", "Inactive"]).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { teachers } = await import("../drizzle/schema");
      const { id, ...changes } = input;
      if (input.staffId) {
        const duplicate = (await findTeachersByStaffId(input.staffId.trim())).some((teacher) => teacher.id !== id);
        if (duplicate) throw new Error("Staff ID already exists");
      }
      await db.update(teachers).set(changes).where((await import("drizzle-orm")).eq(teachers.id, id));
      return { success: true };
    }),
    deleteTeacher: localAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { teachers } = await import("../drizzle/schema");
      await db.delete(teachers).where((await import("drizzle-orm")).eq(teachers.id, input.id));
      return { success: true };
    }),
    createResult: localAdminProcedure.input(z.object({ studentId: z.number(), studentName: z.string().min(2), className: z.string().min(2), term: z.string().min(1), session: z.string().min(1), subjectsJson: z.string().min(2), totalScore: z.number().int().min(0), average: z.number().int().min(0), overallPercentage: z.number().int().min(0), position: z.string().optional(), teacherComment: z.string().optional(), principalComment: z.string().optional() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.insert(results).values(input); return { success: true }; }),
    updateResult: localAdminProcedure.input(z.object({ id: z.number(), studentId: z.number().optional(), studentName: z.string().min(2).optional(), className: z.string().min(2).optional(), term: z.string().min(1).optional(), session: z.string().min(1).optional(), subjectsJson: z.string().min(2).optional(), totalScore: z.number().int().min(0).optional(), average: z.number().int().min(0).optional(), overallPercentage: z.number().int().min(0).optional(), position: z.string().optional(), teacherComment: z.string().optional(), principalComment: z.string().optional() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const { id, ...changes } = input; await db.update(results).set(changes).where((await import("drizzle-orm")).eq(results.id, id)); return { success: true }; }),
    deleteResult: localAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.delete(results).where((await import("drizzle-orm")).eq(results.id, input.id));
      return { success: true };
    }),
    createEvent: localAdminProcedure.input(z.object({ title: z.string().min(2), description: z.string().min(2), eventDate: z.string().min(1), imageUrl: z.string().url().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { events } = await import("../drizzle/schema");
      await db.insert(events).values(input);
      return { success: true };
    }),
    updateEvent: localAdminProcedure.input(z.object({ id: z.number(), title: z.string().min(2).optional(), description: z.string().min(2).optional(), eventDate: z.string().min(1).optional(), imageUrl: z.string().url().optional() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const { events } = await import("../drizzle/schema"); const { id, ...changes } = input; await db.update(events).set(changes).where((await import("drizzle-orm")).eq(events.id, id)); return { success: true }; }),
    deleteEvent: localAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { events } = await import("../drizzle/schema");
      await db.delete(events).where((await import("drizzle-orm")).eq(events.id, input.id));
      return { success: true };
    }),
    createGalleryImage: localAdminProcedure.input(z.object({ title: z.string().min(2), imageUrl: z.string().url(), altText: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { galleryImages } = await import("../drizzle/schema");
      await db.insert(galleryImages).values(input);
      return { success: true };
    }),
    updateGalleryImage: localAdminProcedure.input(z.object({ id: z.number(), title: z.string().min(2).optional(), imageUrl: z.string().url().optional(), altText: z.string().optional() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const { galleryImages } = await import("../drizzle/schema"); const { id, ...changes } = input; await db.update(galleryImages).set(changes).where((await import("drizzle-orm")).eq(galleryImages.id, id)); return { success: true }; }),
    deleteGalleryImage: localAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { galleryImages } = await import("../drizzle/schema");
      await db.delete(galleryImages).where((await import("drizzle-orm")).eq(galleryImages.id, input.id));
      return { success: true };
    }),
    uploadImage: localAdminProcedure.input(z.object({ fileName: z.string().min(1), mimeType: z.string().startsWith("image/"), base64: z.string().min(20) })).mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
      const uploaded = await storagePut(`school-images/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`, buffer, input.mimeType);
      return uploaded;
    }),
    updateComplaint: localAdminProcedure.input(z.object({ id: z.number(), status: z.enum(["New", "In Review", "Resolved"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.update(complaints).set({ status: input.status }).where((await import("drizzle-orm")).eq(complaints.id, input.id));
      return { success: true };
    }),
    updatePayment: localAdminProcedure.input(z.object({ id: z.number(), status: z.enum(["Confirmed", "Rejected"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.update(payments).set({ status: input.status }).where((await import("drizzle-orm")).eq(payments.id, input.id));
      return { success: true };
    }),
    snapshot: localAdminProcedure.query(({ ctx }) => {
      return getSchoolAdminSnapshot();
    }),
  }),
});

export type AppRouter = typeof appRouter;
