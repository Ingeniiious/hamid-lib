ALTER TABLE "course" ADD COLUMN "program_id" integer;--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_program_id_idx" ON "course" USING btree ("program_id");