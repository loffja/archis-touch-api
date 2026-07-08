// Igual que requireAdminKey, pero con su propia variable de entorno y
// header, pensado para el bot del juego (que reporta posiciones) en vez
// de para ti como administrador. Así, si algún día se filtra una de las
// dos claves, la otra sigue siendo segura.
export function requireBotKey(req, res, next) {
    const key = req.headers['x-bot-key'];

    if (!process.env.BOT_API_KEY) {
        console.error('BOT_API_KEY no está configurada en el servidor.');
        return res.status(500).json({ message: 'Configuración del bot incompleta.' });
    }

    if (!key || key !== process.env.BOT_API_KEY) {
        return res.status(401).json({ message: 'No autorizado.' });
    }

    next();
}