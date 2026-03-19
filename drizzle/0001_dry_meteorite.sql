ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "users_cursor_pagination_idx" ON "users" USING btree ("id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "users_active_idx" ON "users" USING btree ("deleted_at");