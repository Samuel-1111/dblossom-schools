import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  admissionNumber: varchar("admissionNumber", { length: 40 }).notNull().unique(),
  className: varchar("className", { length: 20 }).notNull(),
  gender: varchar("gender", { length: 20 }),
  dateOfBirth: varchar("dateOfBirth", { length: 20 }),
  parentName: varchar("parentName", { length: 160 }),
  parentPhone: varchar("parentPhone", { length: 40 }),
  parentEmail: varchar("parentEmail", { length: 320 }),
  boardingStatus: varchar("boardingStatus", { length: 20 }),
  password: varchar("password", { length: 120 }).notNull(),
  status: varchar("status", { length: 20 }).default("Active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const teachers = mysqlTable("teachers", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  staffId: varchar("staffId", { length: 40 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 40 }),
  subject: varchar("subject", { length: 100 }),
  role: varchar("role", { length: 40 }).default("Teaching Staff").notNull(),
  assignedClass: varchar("assignedClass", { length: 20 }),
  password: varchar("password", { length: 120 }).notNull(),
  status: varchar("status", { length: 20 }).default("Active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const results = mysqlTable("results", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  studentName: varchar("studentName", { length: 160 }).notNull(),
  className: varchar("className", { length: 20 }).notNull(),
  term: varchar("term", { length: 30 }).notNull(),
  session: varchar("session", { length: 20 }).notNull(),
  subjectsJson: text("subjectsJson").notNull(),
  totalScore: int("totalScore").default(0).notNull(),
  average: int("average").default(0).notNull(),
  overallPercentage: int("overallPercentage").default(0).notNull(),
  position: varchar("position", { length: 20 }),
  teacherComment: text("teacherComment"),
  principalComment: text("principalComment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  studentName: varchar("studentName", { length: 160 }).notNull(),
  className: varchar("className", { length: 20 }).notNull(),
  amount: int("amount").notNull(),
  status: varchar("status", { length: 20 }).default("Pending").notNull(),
  paymentDate: varchar("paymentDate", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  eventDate: varchar("eventDate", { length: 20 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const galleryImages = mysqlTable("galleryImages", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  altText: varchar("altText", { length: 220 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  subject: varchar("subject", { length: 180 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("New").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type Teacher = typeof teachers.$inferSelect;
export type Result = typeof results.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Event = typeof events.$inferSelect;
export type GalleryImage = typeof galleryImages.$inferSelect;
export type Complaint = typeof complaints.$inferSelect;