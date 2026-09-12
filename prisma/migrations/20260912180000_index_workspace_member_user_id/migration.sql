-- Supports listMembershipsByUserId(userId).
-- The composite primary key starts with workspaceId, so user-scoped lookup needs its own index.

CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
