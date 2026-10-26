const mongoose = require('mongoose');
const addressSchema = require('./schemas/address');

const STATUSES = ['placed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

// The order lifecycle as a small state machine: which status may follow which.
const TRANSITIONS = {
  placed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    // Name and price are copied at checkout so later menu edits never change past orders.
    name: { type: String, required: true },
    priceCents: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 50 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    items: {
      type: [orderItemSchema],
      validate: [(v) => v.length > 0, 'An order needs at least one item'],
    },
    subtotalCents: { type: Number, required: true, min: 0 },
    deliveryFeeCents: { type: Number, required: true, min: 0, default: 0 },
    totalCents: { type: Number, required: true, min: 0 },
    status: { type: String, enum: STATUSES, default: 'placed' },
    statusHistory: [
      {
        _id: false,
        status: { type: String, enum: STATUSES },
        at: { type: Date, default: Date.now },
      },
    ],
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    stripeSessionId: { type: String },
    deliveryAddress: { type: addressSchema, required: true },
    notes: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

orderSchema.index({ restaurant: 1, createdAt: -1 });

orderSchema.methods.canTransitionTo = function canTransitionTo(next) {
  return (TRANSITIONS[this.status] || []).includes(next);
};

const Order = mongoose.model('Order', orderSchema);
Order.STATUSES = STATUSES;
Order.TRANSITIONS = TRANSITIONS;

module.exports = Order;
