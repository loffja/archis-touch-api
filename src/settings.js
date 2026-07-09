import { getOrCreateSettings } from './models/Settings.js';

const CACHE_MS = 5000; // hasta 5s de retraso al activar/desactivar, a cambio de no golpear Mongo en cada petición.
let cached = null;
let cachedAt = 0;

export async function getSettings() {
    const now = Date.now();
    if (cached && now - cachedAt < CACHE_MS) {
        return cached;
    }
    const doc = await getOrCreateSettings();
    cached = { redeemEnabled: doc.redeemEnabled, validateEnabled: doc.validateEnabled };
    cachedAt = now;
    return cached;
}

// Se llama al guardar cambios desde el panel admin, para que se reflejen
// al instante en vez de esperar a que expire la caché.
export function invalidateSettingsCache() {
    cached = null;
}
