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

function attach(req, res, set) {
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

    req.on('close', () => {
        clearInterval(heartbeat);
        set.delete(res);
    });
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
