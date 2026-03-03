import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";

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
