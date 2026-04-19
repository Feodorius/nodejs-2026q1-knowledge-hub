-- This migration changes the default ID generation from cuid() to uuid()
-- for all models so that IDs pass UUID format validation.
-- Existing rows are unaffected; only new rows will receive UUID IDs.

ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Article" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Category" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Comment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "RefreshToken" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Tag" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
