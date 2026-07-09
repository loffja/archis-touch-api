import { Router } from 'express';
import { getOrCreateSettings } from '../models/Settings.js';
import { invalidateSettingsCache } from '../settings.js';
import { requireAdminKey } from '../middleware/requireAdminKey.js';
import { logAction } from '../audit.js';

const router = Router();

// GET /admin/settings
router.get('/admin/settings', requireAdminKey, async (req, res) => {
    try {
        const settings = await getOrCreateSettings();
        res.status(200).json({
            redeemEnabled: settings.redeemEnabled,
            validateEnabled: settings.validateEnabled
        });
    } catch (error) {
        console.error('Error al obtener ajustes:', error);
        res.status(500).json({ message: 'Error al obtener ajustes.' });
    }
});

// PUT /admin/settings
// Body: { redeemEnabled?, validateEnabled? } — solo los campos que mandes se actualizan.
router.put('/admin/settings', requireAdminKey, async (req, res) => {
    const { redeemEnabled, validateEnabled } = req.body;
    const update = {};
    if (typeof redeemEnabled === 'boolean') update.redeemEnabled = redeemEnabled;
    if (typeof validateEnabled === 'boolean') update.validateEnabled = validateEnabled;

    if (Object.keys(update).length === 0) {
        return res.status(400).json({ message: 'Nada que actualizar.' });
    }

    try {
        const settings = await getOrCreateSettings();
        Object.assign(settings, update);
        await settings.save();
        invalidateSettingsCache();

        res.status(200).json({
            redeemEnabled: settings.redeemEnabled,
            validateEnabled: settings.validateEnabled
        });
        logAction('ajustes_actualizados', { ...update, by: req.adminName });
    } catch (error) {
        console.error('Error al actualizar ajustes:', error);
        res.status(500).json({ message: 'Error al actualizar ajustes.' });
    }
});

export default router;
