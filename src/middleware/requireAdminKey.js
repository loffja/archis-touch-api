// Exige que la petición traiga el header "x-admin-key" con el valor exacto
// de la variable de entorno ADMIN_API_KEY. Se usa para proteger las rutas
// de administración (registrar/eliminar/listar licencias) para que no sean
// de acceso público aunque alguien conozca la URL.
export function requireAdminKey(req, res, next) {
    const key = req.headers['x-admin-key'];

    if (!process.env.ADMIN_API_KEY) {
        console.error('ADMIN_API_KEY no está configurada en el servidor.');
        return res.status(500).json({ message: 'Configuración de administrador incompleta.' });
    }

    if (!key || key !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ message: 'No autorizado.' });
    }

    next();
}
