import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    date: { type: Date, default: Date.now }
});

// Se borran solas a los 90 días, para que esto no crezca sin límite.
auditLogSchema.index({ date: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
