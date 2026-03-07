CREATE TABLE "content_report" (
	"id" serial PRIMARY KEY NOT NULL,
	"contribution_id" integer NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"evidence_file_key" text,
	"evidence_file_url" text,
	"evidence_file_name" text,
	"evidence_file_size" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"university_name" text,
	"type" text NOT NULL,
	"faculty_name" text,
	"existing_faculty_id" integer,
	"course_name" text,
	"course_professor" text,
	"course_semester" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contribution" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"course_id" text,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"file_key" text,
	"file_url" text,
	"file_name" text,
	"file_size" integer,
	"file_type" text,
	"text_content" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_note" text,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contributor_stats" (
	"user_id" text PRIMARY KEY NOT NULL,
	"total_contributions" integer DEFAULT 0 NOT NULL,
	"approved_contributions" integer DEFAULT 0 NOT NULL,
	"first_contribution_at" timestamp,
	"last_contribution_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contributor_verification" (
	"user_id" text PRIMARY KEY NOT NULL,
	"university_email" text NOT NULL,
	"university_name" text NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollment_verification" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"professor_id" integer NOT NULL,
	"course_name" text NOT NULL,
	"semester" text NOT NULL,
	"proof_file_key" text NOT NULL,
	"proof_file_url" text NOT NULL,
	"proof_file_name" text NOT NULL,
	"proof_file_size" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enrollment_verif_user_professor" UNIQUE("user_id","professor_id")
);
--> statement-breakpoint
CREATE TABLE "notification_automation" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"trigger" text NOT NULL,
	"trigger_days" integer,
	"template_id" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_automation_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"automation_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"period" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notif_auto_log_dedup" UNIQUE("automation_id","user_id","period")
);
--> statement-breakpoint
CREATE TABLE "notification_campaign" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"url" text,
	"target" text NOT NULL,
	"target_user_id" text,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"stats_sent" integer DEFAULT 0 NOT NULL,
	"stats_failed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professor" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"university" text NOT NULL,
	"department" text,
	"bio" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "professor_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "professor_review" (
	"id" serial PRIMARY KEY NOT NULL,
	"professor_id" integer NOT NULL,
	"course_id" text,
	"user_id" text NOT NULL,
	"overall_rating" integer NOT NULL,
	"difficulty_rating" integer NOT NULL,
	"would_take_again" boolean NOT NULL,
	"review_text" text,
	"tags" jsonb,
	"course_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"moderated_by" text,
	"moderated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prof_review_user_professor" UNIQUE("user_id","professor_id")
);
--> statement-breakpoint
CREATE TABLE "university_domain" (
	"id" serial PRIMARY KEY NOT NULL,
	"university_name" text NOT NULL,
	"domain" text NOT NULL,
	"country" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "university_domain_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "birthday" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "contributor_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "last_active_at" timestamp;--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_contribution_id_contribution_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."contribution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_request" ADD CONSTRAINT "content_request_existing_faculty_id_faculty_id_fk" FOREIGN KEY ("existing_faculty_id") REFERENCES "public"."faculty"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_verification" ADD CONSTRAINT "enrollment_verification_professor_id_professor_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."professor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_automation" ADD CONSTRAINT "notification_automation_template_id_notification_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_automation_log" ADD CONSTRAINT "notification_automation_log_automation_id_notification_automation_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."notification_automation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_campaign" ADD CONSTRAINT "notification_campaign_template_id_notification_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professor_review" ADD CONSTRAINT "professor_review_professor_id_professor_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."professor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professor_review" ADD CONSTRAINT "professor_review_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_report_contribution_id_idx" ON "content_report" USING btree ("contribution_id");--> statement-breakpoint
CREATE INDEX "content_report_status_idx" ON "content_report" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_report_created_at_idx" ON "content_report" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "content_request_user_id_idx" ON "content_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "content_request_status_idx" ON "content_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_request_created_at_idx" ON "content_request" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contribution_user_id_idx" ON "contribution" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contribution_course_id_idx" ON "contribution" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "contribution_status_idx" ON "contribution" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contribution_created_at_idx" ON "contribution" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "enrollment_verif_user_id_idx" ON "enrollment_verification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "enrollment_verif_professor_id_idx" ON "enrollment_verification" USING btree ("professor_id");--> statement-breakpoint
CREATE INDEX "enrollment_verif_status_idx" ON "enrollment_verification" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notif_auto_log_automation_idx" ON "notification_automation_log" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "notif_campaign_status_idx" ON "notification_campaign" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notif_campaign_scheduled_idx" ON "notification_campaign" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "professor_university_idx" ON "professor" USING btree ("university");--> statement-breakpoint
CREATE INDEX "professor_slug_idx" ON "professor" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "prof_review_professor_id_idx" ON "professor_review" USING btree ("professor_id");--> statement-breakpoint
CREATE INDEX "prof_review_status_idx" ON "professor_review" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prof_review_user_id_idx" ON "professor_review" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prof_review_created_at_idx" ON "professor_review" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "university_domain_name_idx" ON "university_domain" USING btree ("university_name");--> statement-breakpoint
CREATE INDEX "analytics_event_created_at_idx" ON "analytics_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_event_name_idx" ON "analytics_event" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_admin_user_id_idx" ON "audit_log" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "calendar_event_user_id_idx" ON "calendar_event" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calendar_event_date_idx" ON "calendar_event" USING btree ("date");--> statement-breakpoint
CREATE INDEX "calendar_event_user_date_idx" ON "calendar_event" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "course_faculty_id_idx" ON "course" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "course_created_at_idx" ON "course" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "faculty_name_idx" ON "faculty" USING btree ("name");--> statement-breakpoint
CREATE INDEX "faculty_university_idx" ON "faculty" USING btree ("university");--> statement-breakpoint
CREATE INDEX "material_course_id_idx" ON "material" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "page_view_created_at_idx" ON "page_view" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "page_view_session_id_idx" ON "page_view" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "page_view_path_idx" ON "page_view" USING btree ("path");--> statement-breakpoint
CREATE INDEX "portal_presentation_user_id_idx" ON "portal_presentation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "portal_presentation_created_at_idx" ON "portal_presentation" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "program_faculty_id_idx" ON "program" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "push_sub_user_id_idx" ON "push_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profile_university_idx" ON "user_profile" USING btree ("university");