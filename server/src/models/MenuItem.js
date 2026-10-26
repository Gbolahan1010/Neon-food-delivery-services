const mongoose = require('mongoose');

const DIETARY_TAGS = ['vegan', 'vegetarian', 'gluten-free', 'halal', 'spicy'];

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name: { type: String, required: [true, 'Item name is required'], trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300 },
    // Money is stored as whole cents to avoid floating-point rounding errors (and Stripe expects cents).
    priceCents: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      validate: [Number.isInteger, 'Price must be a whole number of cents'],
    },
    category: { type: String, trim: true, maxlength: 40, default: 'Mains' },
    dietary: [{ type: String, enum: DIETARY_TAGS }],
    imageUrl: { type: String, trim: true, maxlength: 500 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
MenuItem.DIETARY_TAGS = DIETARY_TAGS;

module.exports = MenuItem;
