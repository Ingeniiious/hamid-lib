CREATE TABLE "note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'Untitled' NOT NULL,
	"content" text,
	"paper_style" text DEFAULT 'blank' NOT NULL,
	"paper_color" text DEFAULT '#ffffff' NOT NULL,
	"font" text DEFAULT 'default' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "note_user_id_idx" ON "note" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "note_updated_at_idx" ON "note" USING btree ("updated_at");