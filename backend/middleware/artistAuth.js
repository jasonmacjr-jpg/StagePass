const jwt = require('jsonwebtoken');
const Artist = require('../models/Artist');

const artistAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'artist') return res.status(401).json({ message: 'Artist access required' });

    const artist = await Artist.findById(decoded.id).select('-password');
    if (!artist) return res.status(401).json({ message: 'Artist not found' });
    if (artist.status !== 'active') return res.status(403).json({ message: 'Artist account not active' });

    req.artist = artist;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = artistAuth;
