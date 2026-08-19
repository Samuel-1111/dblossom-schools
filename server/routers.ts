import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { complaints, payments, results } from "../drizzle/schema";
import { getDb, findStudent, findTeacher, getSchoolAdminSnapshot, listPublicContent, listResultsForStudent } from "./db";
import { notifyOwner } from "./_core/notification";
import { calculateSubjects, summarizeSubjects } from "../shared/school";
import { storagePut } from "./storage";

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
      const student = await findStudent(input.admissionNumber.trim(), input.password);
      if (!student) return null;
      return { id: student.id, fullName: student.fullName, admissionNumber: student.admissionNumber, className: student.className };
    }),
    results: publicProcedure.input(z.object({ studentId: z.number(), term: z.string().optional(), session: z.string().optional() })).query(({ input }) => listResultsForStudent(input.studentId, input.term, input.session)),
  }),
  teacherPortal: router({
    login: publicProcedure.input(z.object({ staffId: z.string().min(1), password: z.string().min(1) })).mutation(async ({ input }) => {
      const teacher = await findTeacher(input.staffId.trim(), input.password);
      if (!teacher) return null;
      return { id: teacher.id, fullName: teacher.fullName, staffId: teacher.staffId, role: teacher.role, assignedClass: teacher.assignedClass };
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
    createStudent: protectedProcedure.input(z.object({ fullName: z.string().min(2), admissionNumber: z.string().min(1), className: z.string().min(2), password: z.string().min(1), gender: z.string().optional(), parentName: z.string().optional(), parentPhone: z.string().optional(), parentEmail: z.string().email().optional() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { students } = await import("../drizzle/schema");
      await db.insert(students).values(input);
      return { success: true };
    }),
    updateStudent: protectedProcedure.input(z.object({ id: z.number(), fullName: z.string().min(2).optional(), className: z.string().min(2).optional(), status: z.enum(["Active", "Inactive"]).optional(), parentPhone: z.string().optional(), parentEmail: z.string().email().optional() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { students } = await import("../drizzle/schema");
      const { id, ...changes } = input;
      await db.update(students).set(changes).where((await import("drizzle-orm")).eq(students.id, id));
      return { success: true };
    }),
    deleteStudent: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { students } = await import("../drizzle/schema");
      await db.delete(students).where((await import("drizzle-orm")).eq(students.id, input.id));
      return { success: true };
    }),
    uploadImage: protectedProcedure.input(z.object({ fileName: z.string().min(1), mimeType: z.string().startsWith("image/"), base64: z.string().min(20) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin access required");
      const buffer = Buffer.from(input.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
      const uploaded = await storagePut(`school-images/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`, buffer, input.mimeType);
      return uploaded;
    }),
    updateComplaint: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(["New", "In Review", "Resolved"]) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.update(complaints).set({ status: input.status }).where((await import("drizzle-orm")).eq(complaints.id, input.id));
      return { success: true };
    }),
    updatePayment: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(["Confirmed", "Rejected"]) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.update(payments).set({ status: input.status }).where((await import("drizzle-orm")).eq(payments.id, input.id));
      return { success: true };
    }),
    snapshot: protectedProcedure.query(({ ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin access required");
      return getSchoolAdminSnapshot();
    }),
  }),
});

export type AppRouter = typeof appRouter;
