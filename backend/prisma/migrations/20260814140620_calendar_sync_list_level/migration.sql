-- DropForeignKey
ALTER TABLE "calendar_syncs" DROP CONSTRAINT "calendar_syncs_taskId_fkey";

-- DropIndex
DROP INDEX "calendar_syncs_userId_taskId_key";

-- AlterTable
ALTER TABLE "calendar_syncs" DROP COLUMN "taskId",
ADD COLUMN     "listId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "calendar_syncs_userId_listId_key" ON "calendar_syncs"("userId", "listId");

-- AddForeignKey
ALTER TABLE "calendar_syncs" ADD CONSTRAINT "calendar_syncs_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

