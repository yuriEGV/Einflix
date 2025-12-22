import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    externalReference: String,
    amount: Number,
    currency: {
        type: String,
        default: 'CLP'
    },
    planType: {
        type: String,
        enum: ['total', 'medium', 'basic'],
        required: true
    },
    duration: {
        type: String,
        enum: ['monthly', 'yearly'],
        required: true
    },
    status: {
        type: String,
        default: 'pending' // pending, approved, rejected
    },
    paymentDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
