import { Router } from 'express';
import crypto from 'crypto';
import { PromoCode } from '../models/PromoCode.js';
import { Licencia } from '../models/Licencia.js';
import { requireAdminKey } from '../middleware/requireAdminKey.js';
import { logAction } from '../audit.js';
import { getSettings } from '../settings.js';
import { generateReferralCode, creditReferral } from '../referral.js';
import { notifyDiscordBot } from '../discordNotify.js';

const router = Router();

const UNIT_TO_MS = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000
};

// Genera una clave tipo XXXX-XXXX-XXXX, sin caracteres ambiguos (0/O, 1/I).
function generateLicenseKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const group = () =>
        Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('');
    return `${group()}-${group()}-${group()}`;
}

// POST /admin/promocodes
// Crea un código. Body: { code, durationValue?, durationUnit?, maxUses? }
router.post('/admin/promocodes', requireAdminKey, async (req, res) => {
    const { code, durationValue, durationUnit, maxUses } = req.body;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: 'Falta el código.' });
    }

    let parsedDurationValue = null;
    let parsedDurationUnit = null;
    if (durationValue !== undefined && durationValue !== null && durationValue !== '') {
        if (!UNIT_TO_MS[durationUnit]) {
            return res.status(400).json({
                message: `Unidad de duración inválida. Usa una de: ${Object.keys(UNIT_TO_MS).join(', ')}`
            });
        }
        const value = Number(durationValue);
        if (!Number.isFinite(value) || value <= 0) {
            return res.status(400).json({ message: 'durationValue debe ser un número mayor que 0.' });
        }
        parsedDurationValue = value;
        parsedDurationUnit = durationUnit;
    }

    const parsedMaxUses = maxUses !== undefined && maxUses !== null && maxUses !== ''
        ? Number(maxUses)
        : 1;
    if (!Number.isInteger(parsedMaxUses) || parsedMaxUses <= 0) {
        return res.status(400).json({ message: 'maxUses debe ser un número entero mayor que 0.' });
    }

    try {
        const promo = await new PromoCode({
            code: code.trim(),
            durationValue: parsedDurationValue,
            durationUnit: parsedDurationUnit,
            maxUses: parsedMaxUses
        }).save();
        res.status(200).json({ message: 'Código creado con éxito.', promo });
        logAction('codigo_creado', {
            code: promo.code,
            durationValue: promo.durationValue,
            durationUnit: promo.durationUnit,
            maxUses: promo.maxUses,
            by: req.adminName
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Ese código ya existe.' });
        }
        console.error('Error al crear código promocional:', error);
        res.status(500).json({ message: 'Error al crear el código.' });
    }
});

// GET /admin/promocodes
router.get('/admin/promocodes', requireAdminKey, async (req, res) => {
    try {
        const promos = await PromoCode.find().sort({ date: -1 });
        res.status(200).json(promos);
    } catch (error) {
        console.error('Error al listar códigos promocionales:', error);
        res.status(500).json({ message: 'Error al listar códigos.' });
    }
});

// DELETE /admin/promocodes/:code
router.delete('/admin/promocodes/:code', requireAdminKey, async (req, res) => {
    try {
        const result = await PromoCode.deleteOne({ code: req.params.code });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Código no encontrado.' });
        }
        res.status(200).json({ message: 'Código eliminado.' });
        logAction('codigo_eliminado', { code: req.params.code, by: req.adminName });
    } catch (error) {
        console.error('Error al eliminar código promocional:', error);
        res.status(500).json({ message: 'Error al eliminar el código.' });
    }
});

// POST /redeem
// Pública. Body: { code, pc_id, website? }. "website" es un campo honeypot:
// invisible para humanos, pero los bots automatizados suelen rellenarlo. Si
// llega con contenido, se rechaza como si el código fuera inválido, sin dar
// pistas de que se detectó como bot.
router.post('/redeem', async (req, res) => {
    const settings = await getSettings();
    if (!settings.redeemEnabled) {
        return res.status(503).json({ message: 'El canje de códigos está temporalmente desactivado.' });
    }

    const { code, pc_id, website, referralCode } = req.body;

    if (website) {
        return res.status(404).json({ message: 'Código inválido o inactivo.' });
    }

    if (!code || typeof code !== 'string' || !pc_id || typeof pc_id !== 'string') {
        return res.status(400).json({ message: 'Faltan datos en la solicitud.' });
    }

    try {
        const promo = await PromoCode.findOne({ code: code.trim() });

        if (!promo || !promo.active) {
            return res.status(404).json({ message: 'Código inválido o inactivo.' });
        }
        if (promo.uses >= promo.maxUses) {
            return res.status(403).json({ message: 'Este código ya alcanzó su límite de usos.' });
        }

        let expiresAt = null;
        if (promo.durationValue && promo.durationUnit) {
            expiresAt = new Date(Date.now() + promo.durationValue * UNIT_TO_MS[promo.durationUnit]);
        }

        const licencia = generateLicenseKey();
        const ownReferralCode = generateReferralCode();
        await new Licencia({ pc_id, licencia, expiresAt, referralCode: ownReferralCode }).save();

        promo.uses += 1;
        if (promo.uses >= promo.maxUses) promo.active = false;
        await promo.save();

        res.status(200).json({
            message: 'Licencia generada con éxito.',
            licencia,
            expiresAt,
            referralCode: ownReferralCode
        });

        if (referralCode) {
            const credited = await creditReferral(referralCode, pc_id);
            if (credited) {
                logAction('referido_recompensado', {
                    referralCode,
                    referrerPcId: credited.pc_id,
                    nuevoPcId: pc_id
                });
            }
        }
        notifyDiscordBot('licencias');
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Ya existe una licencia registrada para ese PC ID.'
            });
        }
        console.error('Error al canjear código:', error);
        res.status(500).json({ message: 'Error al canjear el código.' });
    }
});

export default router;
