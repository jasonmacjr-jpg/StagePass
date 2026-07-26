const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Artist = require('../models/Artist');
const Admin = require('../models/Admin');

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const adminToken = socket.handshake.auth?.adminToken || socket.handshake.query?.adminToken;

    if (adminToken) {
      const decoded = jwt.verify(adminToken, process.env.JWT_ADMIN_SECRET);
      const admin = await Admin.findById(decoded.id).select('-password');
      if (!admin) throw new Error('Admin not found');
      socket.userId = admin._id.toString();
      socket.userType = 'admin';
      socket.user = admin;
      return next();
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      let user = await User.findById(decoded.id);
      if (user) {
        socket.userId = user._id.toString();
        socket.userType = 'user';
        socket.user = user;
        return next();
      }
      let artist = await Artist.findById(decoded.id);
      if (artist) {
        socket.userId = artist._id.toString();
        socket.userType = 'artist';
        socket.user = artist;
        return next();
      }
    }

    throw new Error('Authentication required');
  } catch (err) {
    next(new Error('Auth error: ' + err.message));
  }
};

module.exports = socketAuth;
