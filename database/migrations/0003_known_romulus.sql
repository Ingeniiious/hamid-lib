CREATE TABLE "admin_invite" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role_id" integer NOT NULL,
	"token" text NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "admin_role" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_role_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "admin_user" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"invited_by" text,
	"otp_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_name" text NOT NULL,
	"properties" jsonb,
	"user_id" text,
	"session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"details" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"category" text NOT NULL,
	"note" text,
	"location_type" text,
	"campus" text,
	"room" text,
	"url" text,
	"alerts" text,
	"notify" boolean DEFAULT true NOT NULL,
	"recurrence" text,
	"series_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"alert_minutes" integer NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notif_log_event_alert" UNIQUE("event_id","alert_minutes")
);
--> statement-breakpoint
CREATE TABLE "page_view" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"user_id" text,
	"session_id" text,
	"referrer" text,
	"user_agent" text,
	"country" text,
	"city" text,
	"device_type" text,
	"browser" text,
	"os" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"faculty_id" integer NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "program_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text,
	"auth" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_sub_user_endpoint" UNIQUE("user_id","endpoint")
);
--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "faculty_id" integer;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "program_id" integer;--> statement-breakpoint
ALTER TABLE "admin_invite" ADD CONSTRAINT "admin_invite_role_id_admin_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user" ADD CONSTRAINT "admin_user_role_id_admin_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_role"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program" ADD CONSTRAINT "program_faculty_id_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_faculty_id_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE set null ON UPDATE no action;