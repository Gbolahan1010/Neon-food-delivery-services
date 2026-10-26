const { Schema } = require('mongoose');

/** Reusable address sub-document (embedded in User, Restaurant and Order). */
const addressSchema = new Schema(
  {
    line1: { type: String, trim: true, maxlength: 120 },
    line2: { type: String, trim: true, maxlength: 120 },
    city: { type: String, trim: true, maxlength: 60 },
    eircode: { type: String, trim: true, uppercase: true, maxlength: 10 },
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
  },
  { _id: false }
);

module.exports = addressSchema;
