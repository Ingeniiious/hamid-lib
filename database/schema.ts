import { pgTable, text, integer, timestamp, serial, boolean, unique, jsonb, index, uuid } from "drizzle-orm/pg-core";

// ==================
// App tables
// (Auth is managed by Neon Auth in the neon_auth schema)
// ==================

export const faculty = pgTable("faculty", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  university: text("university").notNull(),
  illustration: text("illustration"),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("faculty_name_idx").on(table.name),
  index("faculty_university_idx").on(table.university),
]);

export const program = pgTable("program", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  facultyId: integer("faculty_id")
    .notNull()
    .references(() => faculty.id, { onDelete: "cascade" }),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("program_faculty_id_idx").on(table.facultyId),
]);

export const course = pgTable("course", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  major: text("major"),
  slug: text("slug").unique(),
  semester: text("semester"),
  professor: text("professor"),
  coverImage: text("cover_image"),
  facultyId: integer("faculty_id").references(() => faculty.id, { onDelete: "set null" }),
  programId: integer("program_id").references(() => program.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: text("created_by"),
}, (table) => [
  index("course_faculty_id_idx").on(table.facultyId),
  index("course_program_id_idx").on(table.programId),
  index("course_created_at_idx").on(table.createdAt),
]);

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
  facultyId: integer("faculty_id").references(() => faculty.id, { onDelete: "set null" }),
  programId: integer("program_id").references(() => program.id, { onDelete: "set null" }),
  gender: text("gender"),
  birthday: text("birthday"),             // YYYY-MM-DD
  timezone: text("timezone"),             // IANA timezone e.g. "Europe/Istanbul", "America/New_York"
  avatarUrl: text("avatar_url"),
  avatarKey: text("avatar_key"),
  language: text("language").notNull().default("en"), // "en" | "fa" | "tr"
  contributorVerifiedAt: timestamp("contributor_verified_at"),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("user_profile_university_idx").on(table.university),
]);

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
}, (table) => [
  index("portal_presentation_user_id_idx").on(table.userId),
  index("portal_presentation_created_at_idx").on(table.createdAt),
]);

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

export const calendarEvent = pgTable("calendar_event", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:mm
  endTime: text("end_time").notNull(), // HH:mm
  category: text("category").notNull(), // class, exam, deadline, reminder
  note: text("note"),
  locationType: text("location_type"), // in-person, online
  campus: text("campus"),
  room: text("room"),
  url: text("url"),
  alerts: text("alerts"), // JSON string of alert config
  notify: boolean("notify").notNull().default(true),
  recurrence: text("recurrence"), // none, weekly, biweekly, monthly
  seriesId: text("series_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("calendar_event_user_id_idx").on(table.userId),
  index("calendar_event_date_idx").on(table.date),
  index("calendar_event_user_date_idx").on(table.userId, table.date),
]);

export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh"),
    auth: text("auth"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("push_sub_user_endpoint").on(table.userId, table.endpoint),
    index("push_sub_user_id_idx").on(table.userId),
  ]
);

export const notificationLog = pgTable(
  "notification_log",
  {
    id: serial("id").primaryKey(),
    eventId: text("event_id").notNull(),
    alertMinutes: integer("alert_minutes").notNull(),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
  },
  (table) => [
    unique("notif_log_event_alert").on(table.eventId, table.alertMinutes),
  ]
);

// ==================
// Notification System (admin-managed push campaigns)
// ==================

export const notificationTemplate = pgTable("notification_template", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),    // supports {{name}}, {{days}}, etc.
  body: text("body").notNull(),       // supports {{name}}, {{days}}, etc.
  url: text("url"),                   // click target, supports variables too
  translations: jsonb("translations"),  // { fa: { title, body }, tr: { title, body } }
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notificationCampaign = pgTable("notification_campaign", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => notificationTemplate.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url"),
  target: text("target").notNull(),                 // "all" | "user"
  targetUserId: text("target_user_id"),              // only when target = "user"
  scheduledAt: timestamp("scheduled_at"),            // null = send immediately
  sentAt: timestamp("sent_at"),
  status: text("status").notNull().default("draft"), // draft, scheduled, sending, sent, failed
  statsSent: integer("stats_sent").notNull().default(0),
  statsFailed: integer("stats_failed").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("notif_campaign_status_idx").on(table.status),
  index("notif_campaign_scheduled_idx").on(table.scheduledAt),
]);

// Automated notification triggers
export const notificationAutomation = pgTable("notification_automation", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(),       // welcome, birthday, inactivity, milestone, anniversary
  triggerDays: integer("trigger_days"),      // days threshold (e.g. 1 for welcome_day1, 7 for inactivity_7d)
  templateId: integer("template_id")
    .notNull()
    .references(() => notificationTemplate.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tracks which automations have fired for which users (dedup)
export const notificationAutomationLog = pgTable("notification_automation_log", {
  id: serial("id").primaryKey(),
  automationId: integer("automation_id")
    .notNull()
    .references(() => notificationAutomation.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  period: text("period").notNull(),         // dedup key: "once", "2026", "2026-W10", "2026-03-06"
  sentAt: timestamp("sent_at").notNull().defaultNow(),
}, (table) => [
  unique("notif_auto_log_dedup").on(table.automationId, table.userId, table.period),
  index("notif_auto_log_automation_idx").on(table.automationId),
]);

// ==================
// Admin RBAC
// ==================

export const adminRole = pgTable("admin_role", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  permissions: jsonb("permissions").notNull().$type<string[]>(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminUser = pgTable("admin_user", {
  userId: text("user_id").primaryKey(),
  roleId: integer("role_id")
    .notNull()
    .references(() => adminRole.id, { onDelete: "restrict" }),
  invitedBy: text("invited_by"),
  otpVerifiedAt: timestamp("otp_verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const adminInvite = pgTable("admin_invite", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  roleId: integer("role_id")
    .notNull()
    .references(() => adminRole.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  invitedBy: text("invited_by").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  adminUserId: text("admin_user_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  details: jsonb("details").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("audit_log_created_at_idx").on(table.createdAt),
  index("audit_log_admin_user_id_idx").on(table.adminUserId),
  index("audit_log_action_idx").on(table.action),
]);

// ==================
// Analytics
// ==================

export const pageView = pgTable("page_view", {
  id: serial("id").primaryKey(),
  path: text("path").notNull(),
  userId: text("user_id"),
  sessionId: text("session_id"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  country: text("country"),
  city: text("city"),
  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("page_view_created_at_idx").on(table.createdAt),
  index("page_view_session_id_idx").on(table.sessionId),
  index("page_view_path_idx").on(table.path),
]);

export const analyticsEvent = pgTable("analytics_event", {
  id: serial("id").primaryKey(),
  eventName: text("event_name").notNull(),
  properties: jsonb("properties").$type<Record<string, unknown>>(),
  userId: text("user_id"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("analytics_event_created_at_idx").on(table.createdAt),
  index("analytics_event_name_idx").on(table.eventName),
]);

// ==================
// Professor Ratings
// ==================

export const professor = pgTable("professor", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  university: text("university").notNull(),
  department: text("department"),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("professor_university_idx").on(table.university),
  index("professor_slug_idx").on(table.slug),
]);

export const professorReview = pgTable("professor_review", {
  id: serial("id").primaryKey(),
  professorId: integer("professor_id")
    .notNull()
    .references(() => professor.id, { onDelete: "cascade" }),
  courseId: text("course_id").references(() => course.id, { onDelete: "set null" }),
  userId: text("user_id").notNull(),
  overallRating: integer("overall_rating").notNull(),      // 1-5
  difficultyRating: integer("difficulty_rating").notNull(), // 1-5
  wouldTakeAgain: boolean("would_take_again").notNull(),
  reviewText: text("review_text"),
  tags: jsonb("tags").$type<string[]>(),
  courseName: text("course_name"),                          // denormalized for display
  status: text("status").notNull().default("pending"),      // pending, approved, rejected
  moderatedBy: text("moderated_by"),
  moderatedAt: timestamp("moderated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("prof_review_professor_id_idx").on(table.professorId),
  index("prof_review_status_idx").on(table.status),
  index("prof_review_user_id_idx").on(table.userId),
  index("prof_review_created_at_idx").on(table.createdAt),
  unique("prof_review_user_professor").on(table.userId, table.professorId),
]);

export const enrollmentVerification = pgTable("enrollment_verification", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  professorId: integer("professor_id")
    .notNull()
    .references(() => professor.id, { onDelete: "cascade" }),
  courseName: text("course_name").notNull(),
  semester: text("semester").notNull(),
  proofFileKey: text("proof_file_key").notNull(),
  proofFileUrl: text("proof_file_url").notNull(),
  proofFileName: text("proof_file_name").notNull(),
  proofFileSize: integer("proof_file_size"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("enrollment_verif_user_id_idx").on(table.userId),
  index("enrollment_verif_professor_id_idx").on(table.professorId),
  index("enrollment_verif_status_idx").on(table.status),
  index("enrollment_verif_created_at_idx").on(table.createdAt),
  unique("enrollment_verif_user_professor").on(table.userId, table.professorId),
]);

// ==================
// Content
// ==================

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
}, (table) => [
  index("material_course_id_idx").on(table.courseId),
]);

// ==================
// Contribution System
// ==================

export const universityDomain = pgTable("university_domain", {
  id: serial("id").primaryKey(),
  universityName: text("university_name").notNull(),
  domain: text("domain").notNull().unique(),
  country: text("country"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("university_domain_name_idx").on(table.universityName),
]);

export const contributorVerification = pgTable("contributor_verification", {
  userId: text("user_id").primaryKey(),
  universityEmail: text("university_email").notNull(),
  universityName: text("university_name").notNull(),
  verifiedAt: timestamp("verified_at").notNull().defaultNow(),
});

export const contribution = pgTable("contribution", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  courseId: text("course_id").references(() => course.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'file' | 'text'
  // File fields
  fileKey: text("file_key"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  fileType: text("file_type"),
  // Text field
  textContent: text("text_content"),
  // Moderation
  status: text("status").notNull().default("pending"), // pending, approved, rejected, under_review
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  reportCount: integer("report_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("contribution_user_id_idx").on(table.userId),
  index("contribution_course_id_idx").on(table.courseId),
  index("contribution_status_idx").on(table.status),
  index("contribution_created_at_idx").on(table.createdAt),
]);

export const contentRequest = pgTable("content_request", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  universityName: text("university_name"),
  type: text("type").notNull(), // 'faculty' | 'course'
  // Faculty request fields
  facultyName: text("faculty_name"),
  // Course request fields
  existingFacultyId: integer("existing_faculty_id").references(() => faculty.id, { onDelete: "set null" }),
  courseName: text("course_name"),
  courseProfessor: text("course_professor"),
  courseSemester: text("course_semester"),
  // Moderation
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("content_request_user_id_idx").on(table.userId),
  index("content_request_status_idx").on(table.status),
  index("content_request_created_at_idx").on(table.createdAt),
]);

export const contributorStats = pgTable("contributor_stats", {
  userId: text("user_id").primaryKey(),
  totalContributions: integer("total_contributions").notNull().default(0),
  approvedContributions: integer("approved_contributions").notNull().default(0),
  firstContributionAt: timestamp("first_contribution_at"),
  lastContributionAt: timestamp("last_contribution_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contentReport = pgTable("content_report", {
  id: serial("id").primaryKey(),
  contributionId: integer("contribution_id")
    .notNull()
    .references(() => contribution.id, { onDelete: "cascade" }),
  reporterId: text("reporter_id").notNull(),
  reason: text("reason").notNull(), // 'fake' | 'incorrect' | 'copyright' | 'other'
  description: text("description"),
  evidenceFileKey: text("evidence_file_key"),
  evidenceFileUrl: text("evidence_file_url"),
  evidenceFileName: text("evidence_file_name"),
  evidenceFileSize: integer("evidence_file_size"),
  status: text("status").notNull().default("pending"), // pending, reviewed, dismissed
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("content_report_contribution_id_idx").on(table.contributionId),
  index("content_report_status_idx").on(table.status),
  index("content_report_created_at_idx").on(table.createdAt),
]);

// ==================
// My Space — Notes
// ==================

export const noteFolder = pgTable("note_folder", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  parentId: uuid("parent_id"), // self-referencing for nested folders
  color: text("color").notNull().default("#5227FF"),
  icon: text("icon"), // Phosphor icon name, e.g. "BookOpen", "GraduationCap"
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("note_folder_user_id_idx").on(table.userId),
  index("note_folder_parent_id_idx").on(table.parentId),
]);

export const note = pgTable("note", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  folderId: uuid("folder_id").references(() => noteFolder.id, { onDelete: "set null" }),
  title: text("title").notNull().default("Untitled"),
  content: text("content"), // Tiptap JSON content
  paperStyle: text("paper_style").notNull().default("blank"), // blank, lined, grid, dotted
  paperColor: text("paper_color").notNull().default("#ffffff"),
  paperSize: text("paper_size").notNull().default("a4"), // a4, a5, letter, b5, notebook
  lineAlign: text("line_align").notNull().default("between"), // on-line, between, above
  font: text("font").notNull().default("default"), // default, display, gochi, delicious
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("note_user_id_idx").on(table.userId),
  index("note_folder_id_idx").on(table.folderId),
  index("note_updated_at_idx").on(table.updatedAt),
]);

// ==================
// My Space — Mind Maps
// ==================

export const mindMapFolder = pgTable("mind_map_folder", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  parentId: uuid("parent_id"), // self-referencing for nested folders
  color: text("color").notNull().default("#5227FF"),
  icon: text("icon"), // Phosphor icon name
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("mind_map_folder_user_id_idx").on(table.userId),
  index("mind_map_folder_parent_id_idx").on(table.parentId),
]);

export const mindMap = pgTable("mind_map", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  folderId: uuid("folder_id").references(() => mindMapFolder.id, { onDelete: "set null" }),
  name: text("name").notNull().default("Untitled"),
  nodes: text("nodes"), // React Flow nodes JSON
  edges: text("edges"), // React Flow edges JSON
  viewport: text("viewport"), // React Flow viewport JSON {x, y, zoom}
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("mind_map_user_id_idx").on(table.userId),
  index("mind_map_folder_id_idx").on(table.folderId),
  index("mind_map_updated_at_idx").on(table.updatedAt),
]);
