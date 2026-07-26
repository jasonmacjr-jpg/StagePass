const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Event = require('../models/Event');
const Order = require('../models/Order');
const Message = require('../models/Message');
const Artist = require('../models/Artist');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ message: 'Invalid credentials' });
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign({ id: admin._id }, process.env.JWT_ADMIN_SECRET, { expiresIn: '1d' });
    res.json({ token, admin: { id: admin._id, username: admin.username, email: admin.email, role: admin.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalArtists = await Artist.countDocuments({ status: 'active' });
    const totalEvents = await Event.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([{ $match: { paymentStatus: 'verified' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
    const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
    const openMessages = await Message.countDocuments({ status: 'open' });
    const pendingArtists = await Artist.countDocuments({ status: 'pending' });

    res.json({
      stats: { totalUsers, totalArtists, totalEvents, totalOrders, totalRevenue: totalRevenue[0]?.total || 0, pendingOrders, openMessages, pendingArtists }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/orders', adminAuth, async (req, res) => {
  try {
    const orders = await Order.find().populate('user', 'fullName email').populate('event', 'title date').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/orders/:id', adminAuth, async (req, res) => {
  try {
    const { orderStatus, paymentStatus, adminNotes } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus, paymentStatus, adminNotes, updatedAt: new Date() }, { new: true });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
