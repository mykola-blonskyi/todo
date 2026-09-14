-- PostgreSQL does not index a foreign key column for you, and this schema had
-- no index at all: every cascade from a List sequentially scanned tasks,
-- comments, list_shares, calendar_syncs and list_category_assignments, and
-- Rule 10 puts no cap on how many Lists one delete covers.
--
-- Plain CREATE INDEX rather than CONCURRENTLY: these tables are small enough
-- that the brief write lock is not worth running the migration outside a
-- transaction for, and Prisma applies migrations inside one.

-- CreateIndex
CREATE INDEX "calendar_syncs_listId_idx" ON "calendar_syncs"("listId");

-- CreateIndex
CREATE INDEX "comments_listId_idx" ON "comments"("listId");

-- CreateIndex
CREATE INDEX "comments_taskId_idx" ON "comments"("taskId");

-- CreateIndex
CREATE INDEX "list_category_assignments_categoryId_idx" ON "list_category_assignments"("categoryId");

-- CreateIndex
CREATE INDEX "list_category_assignments_listId_idx" ON "list_category_assignments"("listId");

-- CreateIndex
CREATE INDEX "list_shares_userId_status_idx" ON "list_shares"("userId", "status");

-- CreateIndex
CREATE INDEX "list_templates_ownerId_idx" ON "list_templates"("ownerId");

-- CreateIndex
CREATE INDEX "list_templates_status_idx" ON "list_templates"("status");

-- CreateIndex
CREATE INDEX "lists_ownerId_createdAt_idx" ON "lists"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "lists_templateId_archivedAt_unarchivedAt_idx" ON "lists"("templateId", "archivedAt", "unarchivedAt");

-- CreateIndex
CREATE INDEX "tasks_listId_idx" ON "tasks"("listId");

