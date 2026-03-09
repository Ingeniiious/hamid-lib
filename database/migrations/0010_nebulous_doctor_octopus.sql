CREATE TABLE "mind_map" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"folder_id" uuid,
	"name" text DEFAULT 'Untitled' NOT NULL,
	"nodes" text,
	"edges" text,
	"viewport" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mind_map_folder" (
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
ALTER TABLE "note" ADD COLUMN "line_align" text DEFAULT 'between' NOT NULL;--> statement-breakpoint
ALTER TABLE "mind_map" ADD CONSTRAINT "mind_map_folder_id_mind_map_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."mind_map_folder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mind_map_user_id_idx" ON "mind_map" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mind_map_folder_id_idx" ON "mind_map" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "mind_map_updated_at_idx" ON "mind_map" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "mind_map_folder_user_id_idx" ON "mind_map_folder" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mind_map_folder_parent_id_idx" ON "mind_map_folder" USING btree ("parent_id");