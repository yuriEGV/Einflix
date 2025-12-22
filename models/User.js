import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Por favor, ingresa un nombre'],
    },
    email: {
        type: String,
        required: [true, 'Por favor, ingresa un correo'],
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, 'Por favor, ingresa una contraseña'],
        minlength: 6,
    },
    resetToken: String,
    resetTokenExpiry: Date,
    isPaid: {
        type: Boolean,
        default: false
    },
    subscriptionExpiry: Date,
}, { timestamps: true });

// Encriptar contraseña antes de guardar - REMOVED to avoid context issues in production
// UserSchema.pre('save', async function (next) { ... });

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function (candidatePassword) {
    // Importación dinámica para evitar problemas de contexto
    const bcrypt = await import('bcryptjs');
    return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);
