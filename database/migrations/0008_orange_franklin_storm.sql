CREATE TABLE "note_folder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"color" text DEFAULT '#5227FF' NOT NULL,
	"icon" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
CREATE INDEX "note_folder_user_id_idx" ON "note_folder" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "note_folder_parent_id_idx" ON "note_folder" USING btree ("parent_id");--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_folder_id_note_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."note_folder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_folder_id_idx" ON "note" USING btree ("folder_id");