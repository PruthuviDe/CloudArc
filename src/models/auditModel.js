/**
 * models/auditModel.js
 * ─────────────────────────────────────────────────────────
 * Append-only audit log. Never update or delete rows here.
 */

const pool = require('../config/database');

const AuditModel = {
  /**
   * Write one audit entry (fire-and-forget — never throws).
   */
  async log({ actorId, actorEmail, action, resource, resourceId, metadata, ip, requestId }) {
    try {
      await pool.query(
        `INSERT INTO audit_logs
           (actor_id, actor_email, action, resource, resource_id, metadata, ip, request_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          actorId    || null,
          actorEmail || null,
          action,
          resource,
          resourceId != null ? String(resourceId) : null,
          metadata ? JSON.stringify(metadata) : null,
          ip         || null,
          requestId  || null,
        ]
      );
    } catch (err) {
      // Audit failures must never crash the app
      console.error('[Audit] Write failed:', err.message);
    }
  },

  /** Paginated query — admin use only. */
  async findAll({ actorId, action, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const params = [];

    if (actorId) { params.push(actorId); conditions.push(`actor_id = $${params.length}`); }
    if (action)  { params.push(action);  conditions.push(`action = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT * FROM audit_logs ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM audit_logs ${where}`,
      params.slice(0, -2)
    );

    return { rows, total: parseInt(count, 10) };
  },
};

module.exports = AuditModel;
