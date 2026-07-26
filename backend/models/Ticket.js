const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  quantity: { type: Number, required: true },
  sold: { type: Number, default: 0 },
  benefits: [{ type: String }],
  status: { type: String, enum: ['available', 'sold_out', 'unavailable'], default: 'available' }
});

module.exports = mongoose.model('Ticket', TicketSchema);
