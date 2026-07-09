// Server-Sent Events: mantiene una conexión abierta con cada navegador y le
// "empuja" los datos al instante cuando se registra un archimonstruo nuevo
// — sin que el navegador tenga que ir preguntando.
//
// Hay DOS canales separados:
// - clients: público (usado por /live), NO incluye posición.
// - adminClients: solo para el panel /admin, SÍ incluye posición. Se
//   autentica con la clave de admin como query param, porque el navegador
//   (EventSource) no puede mandar headers personalizados.
const clients = new Set();
const adminClients = new Set();

// Protección contra abuso: como estas conexiones se quedan abiertas
// indefinidamente (a diferencia de una petición normal), alguien podría
// abrir miles a la vez y agotar la memoria/conexiones del servidor sin que
// el rate limiter normal (pensado para peticiones repetidas) lo note.
const MAX_CONNECTIONS_PER_IP = 5;
const MAX_TOTAL_CONNECTIONS = 300;
const connectionsByIp = new Map();

function getClientIp(req) {
    // Requiere `app.set('trust proxy', 1)` en server.js para ser fiable
    // detrás del proxy de Render.
    return req.ip || req.socket.remoteAddress || 'unknown';
}

function attach(req, res, set) {
    const totalOpen = clients.size + adminClients.size;
    if (totalOpen >= MAX_TOTAL_CONNECTIONS) {
        return res.status(503).json({ message: 'Servidor ocupado, inténtalo más tarde.' });
    }

    const ip = getClientIp(req);
    const current = connectionsByIp.get(ip) || 0;
    if (current >= MAX_CONNECTIONS_PER_IP) {
        return res.status(429).json({ message: 'Demasiadas conexiones abiertas desde tu conexión.' });
    }
    connectionsByIp.set(ip, current + 1);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    res.write('\n');

    set.add(res);

    // Late de vez en cuando para que proxies intermedios (Render, Cloudflare)
    // no cierren la conexión por "inactividad".
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 20000);

    function cleanup() {
        clearInterval(heartbeat);
        set.delete(res);
        const remaining = (connectionsByIp.get(ip) || 1) - 1;
        if (remaining <= 0) connectionsByIp.delete(ip);
        else connectionsByIp.set(ip, remaining);
    }

    req.on('close', cleanup);
}

export function sseHandler(req, res) {
    attach(req, res, clients);
}

// EventSource no puede mandar el header x-admin-key, así que aquí la clave
// llega como ?key=... en la URL.
export function sseAdminHandler(req, res) {
    const key = req.query.key;

    if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ message: 'No autorizado.' });
    }

    attach(req, res, adminClients);
}

// Envía el evento público (sin posición) a /live, y el evento completo
// (con posición) a los paneles /admin conectados.
export function broadcastArchimonster(publicPayload, adminPayload) {
    const publicData = `data: ${JSON.stringify(publicPayload)}\n\n`;
    for (const res of clients) {
        res.write(publicData);
    }

    const adminData = `data: ${JSON.stringify(adminPayload)}\n\n`;
    for (const res of adminClients) {
        res.write(adminData);
    }
}
