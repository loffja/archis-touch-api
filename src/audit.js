import { AuditLog } from './models/AuditLog.js';

// No bloqueante: si falla el registro, solo se avisa por consola, nunca
// rompe la petición real del usuario.
export function logAction(action, details = {}) {
    AuditLog.create({ action, details }).catch((err) => {
        console.error('Error guardando en el registro de actividad:', err);
    });
}
