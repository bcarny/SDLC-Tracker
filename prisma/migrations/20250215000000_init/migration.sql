-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('Custom', 'SaaS', 'COTS');

-- CreateEnum
CREATE TYPE "ApplicationSource" AS ENUM ('manual', 'servicenow');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('draft', 'completed');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('primary', 'supporting');

-- CreateEnum
CREATE TYPE "MaturityDimension" AS ENUM ('governance', 'risk_management', 'initiation', 'development_acquisition', 'implementation_assessment', 'operations_maintenance', 'sunset_disposal', 'change_management', 'third_party');

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ApplicationType" NOT NULL,
    "external_id" TEXT,
    "source" "ApplicationSource" NOT NULL DEFAULT 'manual',
    "dimensions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_teams" (
    "application_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'supporting',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_teams_pkey" PRIMARY KEY ("application_id","team_id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "team_id" TEXT,
    "assessment_date" TIMESTAMP(3) NOT NULL,
    "assessor" TEXT,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maturity_scores" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "dimension" "MaturityDimension" NOT NULL,
    "level" INTEGER NOT NULL,
    "evidence" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maturity_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applications_external_id_key" ON "applications"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_external_id_key" ON "teams"("external_id");

-- CreateIndex
CREATE INDEX "assessments_application_id_idx" ON "assessments"("application_id");

-- CreateIndex
CREATE INDEX "assessments_team_id_idx" ON "assessments"("team_id");

-- CreateIndex
CREATE INDEX "maturity_scores_assessment_id_idx" ON "maturity_scores"("assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "maturity_scores_assessment_id_dimension_key" ON "maturity_scores"("assessment_id", "dimension");

-- AddForeignKey
ALTER TABLE "application_teams" ADD CONSTRAINT "application_teams_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_teams" ADD CONSTRAINT "application_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maturity_scores" ADD CONSTRAINT "maturity_scores_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
