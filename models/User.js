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
}, { timestamps: true });

// Encriptar contraseña antes de guardar
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);
