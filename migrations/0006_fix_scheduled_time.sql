
-- Make scheduled_time column nullable
ALTER TABLE "services" ALTER COLUMN "scheduled_time" DROP NOT NULL;
