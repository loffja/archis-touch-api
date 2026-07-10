import { Router } from 'express';
import { Licencia } from '../models/Licencia.js';
import { DailyStat, todayKey } from '../models/DailyStat.js';
import { ARCHIMONSTER_NAMES } from '../data/archimonsterNames.js';

const router = Router();

// GET /stats
// Pública (se muestra en /live): archimonstruos detectados hoy, licencias
// activas ahora mismo, y el archimonstruo más consultado. Ninguno de estos
// datos es sensible (no incluye posiciones ni nada de pago).
router.get('/stats', async (req, res) => {
    try {
        const today = await DailyStat.findOne({ date: todayKey() });
        const archimonstrosHoy = today?.count ?? 0;

        const now = new Date();
        const licenciasActivas = await Licencia.countDocuments({
            $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
        });

        const licencias = await Licencia.find({}, { usedFor: 1 });
        const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const counts = new Map();
        for (const l of licencias) {
            for (const entry of l.usedFor || []) {
                // Solo cuenta usos de las últimas 24h — así "más buscado" no
                // se queda pegado para siempre con datos de hace días.
                if (!entry.date || entry.date < windowStart) continue;
                counts.set(entry.id, (counts.get(entry.id) || 0) + 1);
            }
        }

        let masBuscado = null;
        for (const [id, usos] of counts.entries()) {
            if (!masBuscado || usos > masBuscado.usos) {
                masBuscado = { id, usos, name: ARCHIMONSTER_NAMES[id] || '------' };
            }
        }

        res.status(200).json({
            archimonstrosHoy,
            licenciasActivas,
            masBuscado
        });
    } catch (error) {
        console.error('Error al calcular estadísticas:', error);
        res.status(500).json({ message: 'Error al calcular estadísticas.' });
    }
});

export default router;
