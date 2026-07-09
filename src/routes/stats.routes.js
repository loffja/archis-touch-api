import { Router } from 'express';
import { Licencia } from '../models/Licencia.js';
import { DailyStat, todayKey } from '../models/DailyStat.js';
import { ARCHIMONSTER_NAMES } from '../data/archimonsterNames.js';
import { requireAdminKey } from '../middleware/requireAdminKey.js';

const router = Router();

// GET /admin/stats
// Foto rápida del negocio: archimonstruos detectados hoy, licencias
// activas ahora mismo, y el archimonstruo más consultado (agregando el
// historial de uso guardado en cada licencia).
router.get('/admin/stats', requireAdminKey, async (req, res) => {
    try {
        const today = await DailyStat.findOne({ date: todayKey() });
        const archimonstrosHoy = today?.count ?? 0;

        const now = new Date();
        const licenciasActivas = await Licencia.countDocuments({
            $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
        });

        const licencias = await Licencia.find({}, { usedFor: 1 });
        const counts = new Map();
        for (const l of licencias) {
            for (const entry of l.usedFor || []) {
                counts.set(entry.id, (counts.get(entry.id) || 0) + 1);
            }
        }

        let masBuscado = null;
        for (const [id, usos] of counts.entries()) {
            if (!masBuscado || usos > masBuscado.usos) {
                masBuscado = { id, usos, name: ARCHIMONSTER_NAMES[id] || 'Desconocido' };
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
