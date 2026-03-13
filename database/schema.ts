import { pgTable, text, integer, timestamp, serial, boolean, unique, jsonb, index, uuid, numeric } from "drizzle-orm/pg-core";

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
  /** i18n overrides: {"tr": {"name": "..."}, "fa": {"name": "..."}} */
  translations: jsonb("translations").$type<Record<string, { name?: string; description?: string }>>().default({}),
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
  /** i18n overrides: {"tr": {"name": "..."}, "fa": {"name": "..."}} */
  translations: jsonb("translations").$type<Record<string, { name?: string }>>().default({}),
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
  /** i18n overrides: {"tr": {"title": "..."}, "fa": {"title": "..."}} */
  translations: jsonb("translations").$type<Record<string, { title?: string; description?: string }>>().default({}),
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
  index("notif_campaign_created_desc_idx").on(table.createdAt.desc()),
]);

// Automated notification triggers
export const notificationAutomation = pgTable("notification_automation", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(),       // welcome, birthday, inactivity, milestone, anniversary
  triggerDays: integer("trigger_days"),      // days threshold (e.g. 1 for welcome_day1, 7 for inactivity_7d)
  sendTime: text("send_time").notNull().default("09:00"), // HH:mm — fires at this time in each user's local timezone
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

export const noteAsset = pgTable("note_asset", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  url: text("url").notNull(),
  objectKey: text("object_key").notNull(),
  fileName: text("file_name"), // original file name for display
  fileSize: integer("file_size"), // bytes, after compression
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("note_asset_user_id_idx").on(table.userId),
  index("note_asset_created_at_idx").on(table.createdAt),
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

// ==================
// My Space — Tasks
// ==================

export const task = pgTable("task", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date"),                    // YYYY-MM-DD (optional)
  courseId: text("course_id").references(() => course.id, { onDelete: "set null" }),
  priority: text("priority").notNull().default("medium"), // low, medium, high
  status: text("status").notNull().default("pending"),    // pending, completed
  subtasks: jsonb("subtasks").$type<{ id: string; title: string; completed: boolean }[]>(),
  reminder: text("reminder").notNull().default("none"),   // none, at_deadline, daily, weekly
  notify: boolean("notify").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("task_user_id_idx").on(table.userId),
  index("task_user_status_idx").on(table.userId, table.status),
  index("task_due_date_idx").on(table.dueDate),
  index("task_course_id_idx").on(table.courseId),
]);

// ==================
// AI Teachers' Council
// Multi-model pipeline that processes student contributions into verified study content
// ==================

export const aiModelConfig = pgTable("ai_model_config", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                    // "Kimi 2.5", "ChatGPT", "Claude Sonnet 4.6", "Gemini"
  slug: text("slug").notNull().unique(),            // "kimi", "chatgpt", "claude", "gemini"
  provider: text("provider").notNull(),             // "moonshot", "openai", "anthropic", "google"
  modelId: text("model_id").notNull(),              // "kimi-2.5", "gpt-4o", "claude-sonnet-4-6", "gemini-2.5-pro"
  role: text("role").notNull(),                     // "creator", "reviewer", "enricher", "validator"
  pipelineOrder: integer("pipeline_order").notNull(), // 1, 2, 3, 4
  costPerInputToken: numeric("cost_per_input_token", { precision: 12, scale: 10 }),
  costPerOutputToken: numeric("cost_per_output_token", { precision: 12, scale: 10 }),
  maxInputTokens: integer("max_input_tokens"),
  maxOutputTokens: integer("max_output_tokens"),
  enabled: boolean("enabled").notNull().default(true),
  config: jsonb("config"),                          // extra provider-specific config (temperature, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("ai_model_config_slug_idx").on(table.slug),
]);

export const pipelineJob = pgTable("pipeline_job", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: text("course_id").notNull().references(() => course.id, { onDelete: "cascade" }),
  contributionIds: jsonb("contribution_ids").notNull(), // array of contribution IDs used as source
  status: text("status").notNull().default("pending"),  // pending, extracting, reviewing, enriching, validating, publishing, completed, failed, cancelled
  currentStep: integer("current_step").notNull().default(0), // which pipeline_order step we're on
  outputTypes: jsonb("output_types").notNull(),          // requested output types: ["study_guide", "flashcards", ...]
  sourceLanguage: text("source_language"),                // language of source content (e.g. "en", "tr", "fa")
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(5),
  // Cost tracking
  totalInputTokens: integer("total_input_tokens").notNull().default(0),
  totalOutputTokens: integer("total_output_tokens").notNull().default(0),
  totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
  // Version tracking
  version: integer("version").notNull().default(1),
  startedBy: text("started_by").notNull(),              // admin user who triggered
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("pipeline_job_course_id_idx").on(table.courseId),
  index("pipeline_job_status_idx").on(table.status),
  index("pipeline_job_created_at_idx").on(table.createdAt),
]);

export const pipelineStep = pgTable("pipeline_step", {
  id: serial("id").primaryKey(),
  jobId: uuid("job_id").notNull().references(() => pipelineJob.id, { onDelete: "cascade" }),
  modelSlug: text("model_slug").notNull(),              // "kimi", "chatgpt", "claude", "gemini"
  role: text("role").notNull(),                         // "creator", "reviewer", "enricher", "validator"
  stepOrder: integer("step_order").notNull(),            // matches pipeline_order from model config
  status: text("status").notNull().default("pending"),   // pending, running, completed, failed, skipped
  // Input
  inputHash: text("input_hash"),                        // SHA-256 of input for dedup/caching
  inputSummary: text("input_summary"),                  // brief description of what was sent
  // Output
  output: jsonb("output"),                              // full structured output from the model
  // Review decision
  verdict: text("verdict"),                             // "approved", "needs_changes", "rejected" (null for creator)
  issues: jsonb("issues"),                              // [{field, description, severity}] flagged issues
  // Cost
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
  // Timing
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("pipeline_step_job_id_idx").on(table.jobId),
  index("pipeline_step_status_idx").on(table.status),
  index("pipeline_step_model_slug_idx").on(table.modelSlug),
]);

export const generatedContent = pgTable("generated_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: text("course_id").notNull().references(() => course.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").references(() => pipelineJob.id, { onDelete: "set null" }),
  contentType: text("content_type").notNull(),          // "study_guide", "flashcards", "quiz", "mock_exam", "podcast_script", "video_script", "mind_map", "infographic_data", "slide_deck", "data_table", "report", "interactive_section"
  title: text("title").notNull(),
  description: text("description"),
  // Structured content (for quiz, flashcards, slides, data tables, mind maps, etc.)
  content: jsonb("content"),
  // Media content (for podcast audio, video, infographic images)
  mediaUrl: text("media_url"),                          // R2 CDN URL
  mediaKey: text("media_key"),                          // R2 object key
  mediaType: text("media_type"),                        // MIME type
  mediaSize: integer("media_size"),                     // bytes
  // Rich text content (for study guides, reports)
  richText: text("rich_text"),                          // Tiptap-compatible JSON
  // Metadata
  language: text("language").notNull().default("en"),
  modelSource: text("model_source"),                    // which model produced this variant (for mock exams)
  version: integer("version").notNull().default(1),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("generated_content_course_id_idx").on(table.courseId),
  index("generated_content_type_idx").on(table.contentType),
  index("generated_content_published_idx").on(table.isPublished),
  index("generated_content_course_type_idx").on(table.courseId, table.contentType),
]);

// ==================
// Content Translations
// Stores translated versions of generated content as separate rows per language.
// No empty columns — only rows that exist have been translated.
// ==================

export const contentTranslation = pgTable("content_translation", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id").notNull().references(() => generatedContent.id, { onDelete: "cascade" }),
  targetLanguage: text("target_language").notNull(),     // ISO 639-1: "en", "fa", "tr", "es", etc.
  // Translated content (same structure as original, different language)
  content: jsonb("content"),                             // translated structured content (flashcards, quiz, etc.)
  richText: text("rich_text"),                           // translated rich text (study guides, reports)
  title: text("title").notNull(),                        // translated title
  description: text("description"),                      // translated description
  // Translation metadata
  translatedBy: text("translated_by").notNull(),         // model slug: "chatgpt", "kimi"
  translationMode: text("translation_mode").notNull(),   // "batch" (GPT, 50% off) or "instant" (Kimi)
  // Cost tracking
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
  // Status
  status: text("status").notNull().default("pending"),   // pending, processing, completed, failed
  errorMessage: text("error_message"),
  // Batch API tracking (for GPT batch jobs)
  batchJobId: text("batch_job_id"),                      // OpenAI batch job ID
  // Timestamps
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("content_translation_content_id_idx").on(table.contentId),
  index("content_translation_lang_idx").on(table.targetLanguage),
  index("content_translation_status_idx").on(table.status),
  unique("content_translation_content_lang").on(table.contentId, table.targetLanguage),
]);

export const contentChallenge = pgTable("content_challenge", {
  id: serial("id").primaryKey(),
  contentId: uuid("content_id").notNull().references(() => generatedContent.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  challengeText: text("challenge_text").notNull(),      // student's challenge explanation
  fieldPath: text("field_path"),                        // specific field in JSONB e.g. "flashcards[3].answer"
  status: text("status").notNull().default("pending"),  // pending, evaluating, accepted, rejected
  // AI council response
  evaluationJobId: uuid("evaluation_job_id").references(() => pipelineJob.id, { onDelete: "set null" }),
  responseText: text("response_text"),                  // council's explanation
  verdict: text("verdict"),                             // "correction_accepted", "content_correct", "partially_correct"
  reviewedBy: text("reviewed_by"),                      // admin who approved the final decision
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("content_challenge_content_id_idx").on(table.contentId),
  index("content_challenge_status_idx").on(table.status),
  index("content_challenge_user_id_idx").on(table.userId),
  index("content_challenge_created_at_idx").on(table.createdAt),
]);

// ==================
// Content Extraction Pipeline
// Tracks file extraction (Phase 1 deterministic + Phase 2 Kimi multimodal) per contribution
// ==================

export const extractionJob = pgTable("extraction_job", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributionId: integer("contribution_id")
    .notNull()
    .references(() => contribution.id, { onDelete: "cascade" }),
  courseId: text("course_id")
    .notNull()
    .references(() => course.id, { onDelete: "cascade" }),
  // File info (copied from contribution for easy access)
  fileName: text("file_name").notNull(),
  fileKey: text("file_key").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),         // "pdf", "docx", "pptx", "image", "video"
  fileSize: integer("file_size"),
  // Status
  status: text("status").notNull().default("pending"), // pending, downloading, extracting, classifying, completed, failed
  currentPhase: integer("current_phase").notNull().default(0), // 0=not started, 1=deterministic, 2=multimodal
  // Extraction output
  extractedContent: jsonb("extracted_content"),    // DeterministicResult from Phase 1
  sourceContent: text("source_content"),           // Final flattened markdown (output of Phase 2)
  sourceLanguage: text("source_language"),         // Auto-detected language code (e.g. "en", "tr", "fa", "es")
  // Image processing tracking
  totalImages: integer("total_images").notNull().default(0),
  processedImages: integer("processed_images").notNull().default(0),
  // Cost tracking
  extractionTokens: integer("extraction_tokens").notNull().default(0),
  extractionCostUsd: numeric("extraction_cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
  // Error handling
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(5),
  // Requested output types (carried through to pipeline job creation)
  outputTypes: jsonb("output_types"),                // ["study_guide", "flashcards", "quiz", ...] — null = use defaults
  // Linking to AI Council pipeline
  pipelineJobId: uuid("pipeline_job_id").references(() => pipelineJob.id, { onDelete: "set null" }),
  // Timestamps
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("extraction_job_contribution_id_idx").on(table.contributionId),
  index("extraction_job_course_id_idx").on(table.courseId),
  index("extraction_job_status_idx").on(table.status),
  index("extraction_job_created_at_idx").on(table.createdAt),
]);

// ==================
// Support Ticketing System
// ==================

export const supportTicket = pgTable("support_ticket", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  subject: text("subject").notNull(),
  category: text("category").notNull().default("general"), // general, technical, billing, content, bug
  priority: text("priority").notNull().default("medium"),   // low, medium, high
  status: text("status").notNull().default("open"),         // open, awaiting_reply, resolved, closed
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("support_ticket_user_id_idx").on(table.userId),
  index("support_ticket_status_idx").on(table.status),
  index("support_ticket_created_at_idx").on(table.createdAt),
  index("support_ticket_last_message_at_idx").on(table.lastMessageAt),
]);

export const supportMessage = pgTable("support_message", {
  id: serial("id").primaryKey(),
  ticketId: uuid("ticket_id").notNull().references(() => supportTicket.id, { onDelete: "cascade" }),
  senderType: text("sender_type").notNull(), // user, admin, ai
  senderId: text("sender_id"),
  message: text("message").notNull(),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("support_message_ticket_id_idx").on(table.ticketId),
  index("support_message_created_at_idx").on(table.createdAt),
]);

// ==================
// Exam Attempts & AI Grading
// ==================

export const examAttempt = pgTable("exam_attempt", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  contentId: uuid("content_id").notNull().references(() => generatedContent.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => course.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(),             // "quiz" or "mock_exam"
  // Student answers — array of { questionIndex, sectionIndex?, answer }
  answers: jsonb("answers").notNull(),
  // Grading state
  status: text("status").notNull().default("submitted"),   // submitted, grading, graded
  // Scores
  totalScore: numeric("total_score", { precision: 6, scale: 2 }),
  totalPossible: numeric("total_possible", { precision: 6, scale: 2 }),
  autoScore: numeric("auto_score", { precision: 6, scale: 2 }),     // points from code-graded questions
  aiScore: numeric("ai_score", { precision: 6, scale: 2 }),         // points from AI-graded questions
  // Per-question results — array of { questionId, verdict, pointsEarned, feedback? }
  results: jsonb("results"),
  // AI grading metadata
  gradingModel: text("grading_model"),                     // "kimi" — which model graded AI questions
  gradingTokens: integer("grading_tokens").notNull().default(0),
  gradingCostUsd: numeric("grading_cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
  // Timing
  startedAt: timestamp("started_at"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  gradedAt: timestamp("graded_at"),
  timeSpentSeconds: integer("time_spent_seconds"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("exam_attempt_user_id_idx").on(table.userId),
  index("exam_attempt_content_id_idx").on(table.contentId),
  index("exam_attempt_course_id_idx").on(table.courseId),
  index("exam_attempt_status_idx").on(table.status),
  index("exam_attempt_user_content_idx").on(table.userId, table.contentId),
]);
