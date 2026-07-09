import mongoose from 'mongoose';

// Documento único (siempre el mismo) con los interruptores del sitio.
const settingsSchema = new mongoose.Schema({
    redeemEnabled: { type: Boolean, default: true },
    validateEnabled: { type: Boolean, default: true }
});

export const Settings = mongoose.model('Settings', settingsSchema);

// Siempre trabaja sobre el mismo documento (lo crea si no existe todavía).
export async function getOrCreateSettings() {
    return Settings.findOneAndUpdate(
        {},
        {},
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}
