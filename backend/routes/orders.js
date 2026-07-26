const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { eventId, tickets, customerNotes } = req.body;
    let totalAmount = 0;
    const orderTickets = [];

    for (const item of tickets) {
      const ticket = await Ticket.findById(item.ticketId);
      if (!ticket || ticket.status === 'sold_out') return res.status(400).json({ message: 'Ticket not available' });
      if (ticket.quantity - ticket.sold < item.quantity) return res.status(400).json({ message: 'Not enough tickets' });
      totalAmount += ticket.price * item.quantity;
      orderTickets.push({ ticket: ticket._id, quantity: item.quantity, unitPrice: ticket.price });
    }

    const orderNumber = `SP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const ticketCode = `TKT-${uuidv4().substr(0, 8).toUpperCase()}`;

    const order = new Order({ orderNumber, user: req.user._id, event: eventId, tickets: orderTickets, totalAmount, customerNotes, ticketCode });
    await order.save();

    for (const item of tickets) await Ticket.findByIdAndUpdate(item.ticketId, { $inc: { sold: item.quantity } });
    await Event.findByIdAndUpdate(eventId, { $inc: { soldTickets: tickets.reduce((s, t) => s + t.quantity, 0) } });

    res.json({ message: 'Order created! Please complete payment.', order: { orderNumber, totalAmount, ticketCode } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate('event', 'title date venue image').populate('tickets.ticket', 'type').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).populate('event').populate('tickets.ticket');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
