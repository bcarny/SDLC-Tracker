-- AlterTable
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "scores_snapshot" JSONB;
