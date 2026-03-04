import { pgTable, text, integer, timestamp, serial, boolean } from "drizzle-orm/pg-core";

// ==================
// App tables
// (Auth is managed by Neon Auth in the neon_auth schema)
// ==================

export const course = pgTable("course", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  major: text("major"),
  slug: text("slug").unique(),
  semester: text("semester"),
  professor: text("professor"),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: text("created_by"),
});

export const emailVerification = pgTable("email_verification", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  otpCode: text("otp_code").notNull(),
  type: text("type").notNull().default("signup"),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userProfile = pgTable("user_profile", {
  userId: text("user_id").primaryKey(),
  university: text("university"),
  gender: text("gender"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const portalPresentation = pgTable("portal_presentation", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  fileName: text("file_name").notNull(),
  fileKey: text("file_key").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  requireApproval: boolean("require_approval").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const portalCode = pgTable("portal_code", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  presentationId: integer("presentation_id")
    .notNull()
    .references(() => portalPresentation.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  approved: boolean("approved"),
  approvedAt: timestamp("approved_at"),
  requestedAt: timestamp("requested_at"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const material = pgTable("material", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => course.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'note', 'presentation', 'document', 'link', 'video'
  content: text("content"), // structured data extracted from PDFs
  order: integer("order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: text("created_by"),
});
