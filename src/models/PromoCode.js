import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema({
    code: { type: String, unique: true, required: true },
    // Duración de la licencia que se crea al canjear este código.
    // Si durationValue es null, la licencia creada es permanente.
    durationValue: { type: Number, default: null },
    durationUnit: {
        type: String,
        enum: ['minutes', 'hours', 'days', 'weeks', 'months', null],
        default: null
    },
    maxUses: { type: Number, default: 1 },
    uses: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    date: { type: Date, default: Date.now }
});

export const PromoCode = mongoose.model('PromoCode', promoCodeSchema);
