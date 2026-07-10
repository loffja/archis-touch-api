import { Licencia } from './models/Licencia.js';

// Recompensa por cada persona que se registre usando tu código: +2 días.
// Solo gana quien refiere, no la persona nueva.
const REFERRAL_BONUS_MS = 2 * 24 * 60 * 60 * 1000;

export function generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return `REF-${code}`;
}

// Si referralCode es válido, no es auto-referido, y el referente tiene una
// licencia con caducidad (no permanente), le suma 2 días. Nunca lanza error
// — si el código no existe o no aplica, simplemente no hace nada, para no
// romper el registro/canje normal de quien SÍ se está registrando.
export async function creditReferral(referralCode, newPcId) {
    if (!referralCode || typeof referralCode !== 'string') return null;

    try {
        const referrer = await Licencia.findOne({ referralCode: referralCode.trim() });
        if (!referrer) return null;
        if (referrer.pc_id === newPcId) return null; // no autoreferirse
        if (!referrer.expiresAt) return null; // ya es permanente

        const base = Math.max(referrer.expiresAt.getTime(), Date.now());
        referrer.expiresAt = new Date(base + REFERRAL_BONUS_MS);
        await referrer.save();
        return referrer;
    } catch (error) {
        console.error('Error al acreditar referido:', error);
        return null;
    }
}
