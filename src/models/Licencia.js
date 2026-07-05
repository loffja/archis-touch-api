import mongoose from 'mongoose';

const licenciaSchema = new mongoose.Schema({
    pc_id: { type: String, unique: true, required: true },
    licencia: { type: String, required: true },
    // Historial de en qué archimonstruos (por id) se ha usado esta licencia,
    // usado para aplicar el límite de "espera 2 minutos entre usos".
    usedFor: [{ id: Number, date: Date }],
    date: { type: Date, default: Date.now }
});

export const Licencia = mongoose.model('Licencia', licenciaSchema);
