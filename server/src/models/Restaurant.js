const mongoose = require('mongoose');
const addressSchema = require('./schemas/address');

const restaurantSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    description: { type: String, trim: true, maxlength: 500 },
    cuisines: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
      validate: [(v) => v.length <= 5, 'A restaurant can list at most 5 cuisines'],
      index: true,
    },
    address: { type: addressSchema, required: [true, 'Address is required'] },
    phone: { type: String, trim: true, maxlength: 20 },
    imageUrl: { type: String, trim: true, maxlength: 500 },
    isApproved: { type: Boolean, default: false }, // admin approves before it is listed
    isOpen: { type: Boolean, default: true },
    deliveryRadiusKm: { type: Number, min: 1, max: 30, default: 8 },
    minimumOrderCents: { type: Number, min: 0, default: 0 },
    ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

// Powers the search box: GET /api/restaurants?search=pizza
restaurantSchema.index({ name: 'text', description: 'text', cuisines: 'text' });

module.exports = mongoose.model('Restaurant', restaurantSchema);
