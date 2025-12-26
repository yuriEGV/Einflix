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
    roles: {
        type: [String],
        default: ['user']
    },
    profiles: [{
        name: String,
        avatar: String,
        isKid: { type: Boolean, default: false },
        preferences: [String]
    }],
    lastLogin: Date,
    stripeCustomerId: String,
    resetToken: String,
    resetTokenExpiry: Date,
    isPaid: {
        type: Boolean,
        default: false
    },
    planType: {
        type: String, // 'total', 'medium', 'basic'
        default: null
    },
    subscriptionExpiry: Date,
    activeSessionId: {
        type: String,
        default: null
    },
}, { timestamps: true });

// Encriptar contraseña antes de guardar - REMOVED to avoid context issues in production
// UserSchema.pre('save', async function (next) { ... });

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        const bcrypt = await import('bcryptjs');
        const compare = bcrypt.compare || bcrypt.default.compare;
        if (!compare) throw new Error('Bcrypt compare function not found');
        return await compare(candidatePassword, this.password);
    } catch (err) {
        console.error('[User Model] Error comparing password:', err);
        throw err;
    }
};

export default mongoose.models.User || mongoose.model('User', UserSchema);
