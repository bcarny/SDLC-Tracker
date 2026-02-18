-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- Add organization_id to applications (nullable first)
ALTER TABLE "applications" ADD COLUMN "organization_id" TEXT;

-- Insert default organization (id format compatible with cuid)
INSERT INTO "organizations" ("id", "name", "description", "created_at", "updated_at")
VALUES ('clr3f4ult0rg0000000000000', 'Default', 'Default organization for existing data', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Backfill applications with default org
UPDATE "applications" SET "organization_id" = 'clr3f4ult0rg0000000000000' WHERE "organization_id" IS NULL;

-- Make organization_id required on applications
ALTER TABLE "applications" ALTER COLUMN "organization_id" SET NOT NULL;

-- Add foreign key and index for applications
CREATE INDEX "applications_organization_id_idx" ON "applications"("organization_id");
ALTER TABLE "applications" ADD CONSTRAINT "applications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add organization_id to teams (optional)
ALTER TABLE "teams" ADD COLUMN "organization_id" TEXT;

-- Backfill teams with default org
UPDATE "teams" SET "organization_id" = 'clr3f4ult0rg0000000000000' WHERE "organization_id" IS NULL;

-- Add index and foreign key for teams
CREATE INDEX "teams_organization_id_idx" ON "teams"("organization_id");
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
