const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

router.post('/', auth, async (req, res) => {
  try {
    const { subject, content } = req.body;
    const message = new Message({ user: req.user._id, subject, content });
    await message.save();
    res.json({ message: 'Message sent! We will reply soon.', ticketId: message._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my-messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/reply', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const msg = await Message.findOne({ _id: req.params.id, user: req.user._id });
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    msg.replies.push({ sender: 'user', message });
    msg.status = 'open';
    msg.updatedAt = new Date();
    await msg.save();
    res.json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;
    const messages = await Message.find(query).populate('user', 'fullName email').sort({ updatedAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/admin/:id/reply', adminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    msg.replies.push({ sender: 'admin', message, adminId: req.admin._id });
    msg.status = 'in_progress';
    msg.updatedAt = new Date();
    await msg.save();

    const io = req.app.get('io');
    io.to(`conv_${msg._id}`).emit('new_message', { conversationId: msg._id, reply: msg.replies[msg.replies.length - 1] });
    io.to(`user_${msg.user}`).emit('admin_replied', { conversationId: msg._id, preview: message.substring(0, 60) });

    res.json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/admin/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const msg = await Message.findByIdAndUpdate(req.params.id, { status, updatedAt: new Date() }, { new: true });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
