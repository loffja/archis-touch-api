import mongoose from 'mongoose';

const licenciaSchema = new mongoose.Schema({
    pc_id: { type: String, unique: true, required: true },
    licencia: { type: String, required: true },
    // Historial de en qué archimonstruos (por id) se ha usado esta licencia,
    // usado para aplicar el límite de "espera 2 minutos entre usos".
    usedFor: [{ id: Number, date: Date }],
    date: { type: Date, default: Date.now },
    // Última vez que se usó esta licencia, para CUALQUIER archimonstruo.
    // Sirve para el cooldown anti-scraping (ver validateLicencia).
    lastUsedAt: { type: Date, default: null },
    // Si se establece, Mongo borrará este documento automáticamente en
    // cuanto se cumpla esta fecha (índice TTL más abajo). Si es null,
    // la licencia es permanente y nunca se borra sola.
    expiresAt: { type: Date, default: null }
});

// Índice TTL: Mongo revisa periódicamente (aprox. cada 60s) y elimina
// cualquier documento cuyo expiresAt ya haya pasado. Los documentos con
// expiresAt en null son ignorados por este índice, así que las licencias
// permanentes no se ven afectadas.
licenciaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Licencia = mongoose.model('Licencia', licenciaSchema);
