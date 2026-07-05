import mongoose from 'mongoose';

const archimonsterSchema = new mongoose.Schema({
    name: String,
    server: String,
    id: { type: Number, required: true },
    position: String,
    date: { type: Date, default: Date.now }
});

export const Archimonster = mongoose.model('Archimonster', archimonsterSchema);
