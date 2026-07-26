const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');

const fs = require('fs');
const dirs = ['uploads/payments', 'uploads/profiles', 'uploads/events'];
dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || 'general';
    const folder = type === 'payment' ? 'uploads/payments' : type === 'profile' ? 'uploads/profiles' : 'uploads/events';
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random()*1e9)}`;
    cb(null, `${req.body.type || 'file'}-${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only images and PDFs allowed'));
  }
});

router.post('/', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const url = `/uploads/${req.body.type === 'payment' ? 'payments' : req.body.type === 'profile' ? 'profiles' : 'events'}/${req.file.filename}`;
  res.json({ message: 'File uploaded', filename: req.file.filename, url, size: req.file.size });
});

module.exports = router;
