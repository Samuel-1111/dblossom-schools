import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, complaints, events, galleryImages, payments, results, students, teachers, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listPublicContent() {
  const db = await getDb();
  if (!db) return { events: [], gallery: [] };
  const [eventRows, galleryRows] = await Promise.all([
    db.select().from(events).orderBy(desc(events.eventDate)),
    db.select().from(galleryImages).orderBy(desc(galleryImages.createdAt)),
  ]);
  return { events: eventRows, gallery: galleryRows };
}

export async function findStudent(admissionNumber: string, password: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(students).where(and(eq(students.admissionNumber, admissionNumber), eq(students.password, password), eq(students.status, "Active"))).limit(1);
  return rows[0];
}

export async function findTeacher(staffId: string, password: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(teachers).where(and(eq(teachers.staffId, staffId), eq(teachers.password, password), eq(teachers.status, "Active"))).limit(1);
  return rows[0];
}

export async function listResultsForStudent(studentId: number, term?: string, session?: string) {
  const db = await getDb();
  if (!db) return [];
  const clauses = [eq(results.studentId, studentId)];
  if (term) clauses.push(eq(results.term, term));
  if (session) clauses.push(eq(results.session, session));
  return db.select().from(results).where(and(...clauses)).orderBy(desc(results.updatedAt));
}

export async function getSchoolAdminSnapshot() {
  const db = await getDb();
  if (!db) return { students: [], teachers: [], results: [], payments: [], complaints: [], events: [], gallery: [] };
  const [studentRows, teacherRows, resultRows, paymentRows, complaintRows, eventRows, galleryRows] = await Promise.all([
    db.select().from(students).orderBy(desc(students.createdAt)),
    db.select().from(teachers).orderBy(desc(teachers.createdAt)),
    db.select().from(results).orderBy(desc(results.updatedAt)),
    db.select().from(payments).orderBy(desc(payments.createdAt)),
    db.select().from(complaints).orderBy(desc(complaints.createdAt)),
    db.select().from(events).orderBy(desc(events.createdAt)),
    db.select().from(galleryImages).orderBy(desc(galleryImages.createdAt)),
  ]);
  return { students: studentRows, teachers: teacherRows, results: resultRows, payments: paymentRows, complaints: complaintRows, events: eventRows, gallery: galleryRows };
}
