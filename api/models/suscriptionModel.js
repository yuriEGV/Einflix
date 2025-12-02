// models/subscriptionModel.js
const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
provider: String, // transbank, mercadopago
plan: String,
status: String,
startDate: Date,
endDate: Date,
lastPayment: Object
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);