const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ArtistSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  stageName: { type: String, default: '' },
  category: { type: String, required: true },
  bio: { type: String, default: '' },
  profileImage: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  phone: { type: String },
  website: { type: String },
  instagram: { type: String },
  twitter: { type: String },
  youtube: { type: String },
  city: { type: String },
  country: { type: String },
  services: [{
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    duration: { type: String },
    active: { type: Boolean, default: true }
  }],
  availability: [{
    day: { type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
    available: { type: Boolean, default: true }
  }],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'active', 'suspended', 'rejected'], default: 'pending' },
  adminNotes: { type: String },
  pendingChanges: [{
    field: String,
    oldValue: String,
    newValue: String,
    requestedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

ArtistSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

ArtistSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

ArtistSchema.methods.toPublicProfile = function() {
  return {
    id: this._id,
    fullName: this.fullName,
    stageName: this.stageName,
    category: this.category,
    bio: this.bio,
    profileImage: this.profileImage,
    coverImage: this.coverImage,
    city: this.city,
    country: this.country,
    services: this.services.filter(s => s.active),
    availability: this.availability,
    rating: this.rating,
    reviewCount: this.reviewCount,
    totalBookings: this.totalBookings,
    social: {
      instagram: this.instagram,
      twitter: this.twitter,
      youtube: this.youtube,
      website: this.website
    },
    status: this.status
  };
};

module.exports = mongoose.model('Artist', ArtistSchema);
