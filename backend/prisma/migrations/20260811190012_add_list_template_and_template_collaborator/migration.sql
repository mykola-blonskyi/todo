-- CreateEnum
CREATE TYPE "ListTemplateRecurrenceType" AS ENUM ('daily', 'weekly', 'monthly', 'everyNDays');

-- CreateEnum
CREATE TYPE "ListTemplateStatus" AS ENUM ('active', 'paused');

-- AlterTable
ALTER TABLE "lists" ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "list_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taskTitles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recurrenceType" "ListTemplateRecurrenceType" NOT NULL,
    "weekDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "dayOfMonth" INTEGER,
    "intervalDays" INTEGER,
    "timezone" TEXT NOT NULL,
    "status" "ListTemplateStatus" NOT NULL DEFAULT 'active',
    "lastSpawnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "list_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_collaborators" (
    "id" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "template_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_collaborators_templateId_userId_key" ON "template_collaborators"("templateId", "userId");

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "list_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_templates" ADD CONSTRAINT "list_templates_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_collaborators" ADD CONSTRAINT "template_collaborators_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "list_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_collaborators" ADD CONSTRAINT "template_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
