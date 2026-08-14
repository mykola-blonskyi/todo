-- AlterTable
ALTER TABLE "list_templates" ADD COLUMN     "defaultCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "list_templates" ADD CONSTRAINT "list_templates_defaultCategoryId_fkey" FOREIGN KEY ("defaultCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

