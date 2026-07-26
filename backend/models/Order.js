const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  tickets: [{
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
    quantity: { type: Number },
    unitPrice: { type: Number }
  }],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['manual_bank', 'cash', 'paypal', 'crypto', 'pending', 'other'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'verified'], default: 'pending' },
  orderStatus: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
  customerNotes: { type: String },
  adminNotes: { type: String },
  paymentProof: { type: String },
  ticketCode: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
