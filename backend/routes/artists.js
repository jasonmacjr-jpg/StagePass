const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Artist = require('../models/Artist');
const { sendVerificationEmail } = require('../utils/email');
const adminAuth = require('../middleware/adminAuth');

// PUBLIC: Get all artists
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = { status: 'active', isVerified: true };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { stageName: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    const artists = await Artist.find(query).select('-password -email -phone -pendingChanges -adminNotes');
    res.json(artists.map(a => a.toPublicProfile()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUBLIC: Get one artist
router.get('/:id', async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id).select('-password -email -phone -pendingChanges -adminNotes');
    if (!artist) return res.status(404).json({ message: 'Artist not found' });
    if (artist.status !== 'active') return res.status(404).json({ message: 'Artist not available' });
    res.json(artist.toPublicProfile());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register as artist
router.post('/register', [
  body('fullName').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('category').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { fullName, email, password, category, stageName, phone, city, country } = req.body;
    let existing = await Artist.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Artist account already exists' });

    const verificationToken = uuidv4();
    const artist = new Artist({
      fullName, email, password, category, stageName, phone, city, country,
      verificationToken,
      availability: [
        { day: 'Mon', available: true }, { day: 'Tue', available: true },
        { day: 'Wed', available: true }, { day: 'Thu', available: true },
        { day: 'Fri', available: true }, { day: 'Sat', available: true },
        { day: 'Sun', available: false }
      ]
    });
    await artist.save();
    await sendVerificationEmail(email, verificationToken);

    res.json({ message: 'Artist registration submitted! Check email. Admin will review your profile.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify email
router.get('/verify/:token', async (req, res) => {
  try {
    const artist = await Artist.findOne({ verificationToken: req.params.token });
    if (!artist) return res.status(400).json({ message: 'Invalid token' });
    artist.isVerified = true;
    artist.verificationToken = undefined;
    await artist.save();
    res.json({ message: 'Email verified! Profile pending admin approval.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Artist login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const artist = await Artist.findOne({ email });
    if (!artist) return res.status(400).json({ message: 'Invalid credentials' });
    if (!artist.isVerified) return res.status(400).json({ message: 'Please verify email first' });
    if (artist.status === 'suspended') return res.status(400).json({ message: 'Account suspended' });
    if (artist.status === 'pending') return res.status(400).json({ message: 'Profile pending admin approval' });

    const isMatch = await artist.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    artist.lastLogin = new Date();
    await artist.save();

    const token = jwt.sign({ id: artist._id, type: 'artist' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      artist: { id: artist._id, fullName: artist.fullName, stageName: artist.stageName, email: artist.email, category: artist.category, status: artist.status, profileImage: artist.profileImage }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my profile (protected)
router.get('/me/profile', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'artist') return res.status(401).json({ message: 'Not an artist' });
    const artist = await Artist.findById(decoded.id).select('-password');
    if (!artist) return res.status(404).json({ message: 'Artist not found' });
    res.json(artist);
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update profile (protected)
router.put('/me/profile', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'artist') return res.status(401).json({ message: 'Not an artist' });

    const artist = await Artist.findById(decoded.id);
    const allowedDirect = ['phone', 'website', 'instagram', 'twitter', 'youtube', 'availability'];
    const needsApproval = ['fullName', 'stageName', 'category', 'bio', 'city', 'country'];

    for (const key of Object.keys(req.body)) {
      if (allowedDirect.includes(key)) artist[key] = req.body[key];
      else if (needsApproval.includes(key)) {
        artist.pendingChanges.push({ field: key, oldValue: artist[key], newValue: req.body[key] });
      }
    }
    await artist.save();
    res.json({ message: 'Profile updated. Some changes may need admin approval.', pendingChanges: artist.pendingChanges });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: Get all artists
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;
    const artists = await Artist.find(query).select('-password').sort({ createdAt: -1 });
    res.json(artists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: Approve/reject artist
router.put('/admin/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const artist = await Artist.findByIdAndUpdate(req.params.id, { status, adminNotes }, { new: true });
    res.json({ message: `Artist ${status}`, artist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
