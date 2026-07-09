import mongoose from 'mongoose';

const adminKeySchema = new mongoose.Schema({
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
    date: { type: Date, default: Date.now }
});

export const AdminKey = mongoose.model('AdminKey', adminKeySchema);
