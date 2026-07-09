import mongoose from 'mongoose';

// Un documento por día (YYYY-MM-DD), con el total de archimonstruos
// registrados ese día. Necesario porque los registros de Archimonster se
// borran solos a los 30-60 min, así que sin esto no habría forma de saber
// cuántos se detectaron "hoy".
const dailyStatSchema = new mongoose.Schema({
    date: { type: String, unique: true, required: true }, // "2026-07-09"
    count: { type: Number, default: 0 }
});

export const DailyStat = mongoose.model('DailyStat', dailyStatSchema);

// YYYY-MM-DD en UTC, usado como clave del día.
export function todayKey() {
    return new Date().toISOString().slice(0, 10);
}
