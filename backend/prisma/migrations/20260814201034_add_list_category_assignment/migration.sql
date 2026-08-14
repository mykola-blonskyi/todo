-- CreateTable
CREATE TABLE "list_category_assignments" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "list_category_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "list_category_assignments_userId_listId_key" ON "list_category_assignments"("userId", "listId");

-- AddForeignKey
ALTER TABLE "list_category_assignments" ADD CONSTRAINT "list_category_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_category_assignments" ADD CONSTRAINT "list_category_assignments_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_category_assignments" ADD CONSTRAINT "list_category_assignments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

