ALTER TABLE "notification_template" ADD COLUMN "translations" jsonb;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
CREATE INDEX "enrollment_verif_created_at_idx" ON "enrollment_verification" USING btree ("created_at");