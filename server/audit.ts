import db from './db.js';

export interface AuditEntry {
  userId?: number;
  userName?: string;
  actionType: 'create' | 'update' | 'delete' | 'close' | 'approve' | 'reject' | 'start' | 'end';
  entityType: 'incident' | 'emergency' | 'roster' | 'feed' | 'approval' | 'evac' | 'shift';
  entityId: string;
  previousState?: unknown;
  newState?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

const insertStmt = db.prepare(`
  INSERT INTO action_logs (user_id, user_name, action_type, entity_type, entity_id, previous_state, new_state, metadata, ip_address)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

/**
 * Log an auditable action to the action_logs table.
 * This function is synchronous (better-sqlite3) and should be called
 * inside the same transaction as the mutation when possible.
 */
export function logAction(entry: AuditEntry): void {
  try {
    insertStmt.run(
      entry.userId ?? null,
      entry.userName ?? null,
      entry.actionType,
      entry.entityType,
      entry.entityId,
      entry.previousState ? JSON.stringify(entry.previousState) : null,
      entry.newState ? JSON.stringify(entry.newState) : null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.ipAddress ?? null,
    );
  } catch (err) {
    // Audit logging must never crash the main operation
    console.error('[audit] Failed to log action:', err);
  }
}

/**
 * Extract user info from an Express request for audit logging.
 */
export function auditUser(req: { user?: { id: number; name: string }; ip?: string }) {
  return {
    userId: req.user?.id,
    userName: req.user?.name,
    ipAddress: req.ip,
  };
}
