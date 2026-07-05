import { Archimonster } from './models/Archimonster.js';
import { notifyWebhook } from './webhook.js';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

// Elimina los registros de archimonstruos con más de 30 minutos de antigüedad
// y notifica al webhook de Discord cuántos se borraron.
export async function cleanOldRecords() {
    const cutoff = new Date(Date.now() - THIRTY_MINUTES_MS);

    try {
        const result = await Archimonster.deleteMany({ date: { $lt: cutoff } });
        console.log(`${result.deletedCount} registros antiguos eliminados.`);

        if (result.deletedCount > 0) {
            await notifyWebhook(result.deletedCount);
        }
    } catch (error) {
        console.error('Error al eliminar registros antiguos:', error);
    }
}

// Arranca el intervalo recurrente. Se llama una vez desde server.js.
export function startCleanupJob() {
    setInterval(cleanOldRecords, THIRTY_MINUTES_MS);
}
