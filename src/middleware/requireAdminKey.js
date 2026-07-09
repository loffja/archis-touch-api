import { AdminKey } from '../models/AdminKey.js';

// Exige que la petición traiga el header "x-admin-key" (o ?key= para SSE)
// con una clave válida: la clave maestra (ADMIN_API_KEY, variable de
// entorno) o cualquier clave adicional creada desde /admin/adminkeys.
// Además, deja anotado en req.adminName QUIÉN hizo la petición, para que
// el registro de actividad diga quién fue en vez de "un admin".
export async function requireAdminKey(req, res, next) {
    const key = req.headers['x-admin-key'] || req.query.key;

    if (!key) {
        return res.status(401).json({ message: 'No autorizado.' });
    }

    if (process.env.ADMIN_API_KEY && key === process.env.ADMIN_API_KEY) {
        req.adminName = 'Admin principal';
        return next();
    }

    try {
        const match = await AdminKey.findOne({ key, active: true });
        if (match) {
            req.adminName = match.name;
            return next();
        }
    } catch (error) {
        console.error('Error comprobando claves de admin adicionales:', error);
    }

    return res.status(401).json({ message: 'No autorizado.' });
}

// Igual que requireAdminKey, pero SOLO acepta la clave maestra
// (ADMIN_API_KEY). Los administradores adicionales, aunque tengan acceso
// normal al panel, no pueden crear ni revocar otros administradores.
export function requireMasterAdminKey(req, res, next) {
    const key = req.headers['x-admin-key'] || req.query.key;

    if (key && process.env.ADMIN_API_KEY && key === process.env.ADMIN_API_KEY) {
        req.adminName = 'Admin principal';
        return next();
    }

    return res.status(403).json({
        message: 'Solo el administrador principal puede gestionar administradores.'
    });
}
