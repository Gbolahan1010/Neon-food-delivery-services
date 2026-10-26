const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const addressSchema = require('./schemas/address');
const { bcryptRounds } = require('../config/env');

const ROLES = ['customer', 'owner', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name must be at most 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email is not valid'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned by queries unless explicitly asked for
    },
    role: { type: String, enum: ROLES, default: 'customer' },
    phone: { type: String, trim: true, maxlength: 20 },
    address: addressSchema,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash the password whenever it is set or changed. Plain-text passwords never reach the database.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, bcryptRounds);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Strip secrets whenever a user is turned into JSON for a response.
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);
User.ROLES = ROLES;

module.exports = User;
