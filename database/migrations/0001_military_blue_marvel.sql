CREATE TABLE "faculty" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"university" text NOT NULL,
	"illustration" text,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "faculty_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "faculty_id" integer;--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_faculty_id_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE set null ON UPDATE no action;