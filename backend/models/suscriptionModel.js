// models/subscriptionModel.js
import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  provider: String, // transbank, mercadopago
  plan: String,
  status: String,
  startDate: Date,
  endDate: Date,
  lastPayment: Object
});

export default mongoose.model('Subscription', SubscriptionSchema);







