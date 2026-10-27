const mongoose = require('mongoose');

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

/**
 * Remembers addresses we have already looked up, so the same address never hits the
 * OpenStreetMap service twice (their usage policy asks apps to cache results).
 * MongoDB deletes each entry automatically after 30 days (a TTL index).
 */
const geocodeCacheSchema = new mongoose.Schema({
  query: { type: String, required: true, unique: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  displayName: { type: String },
  createdAt: { type: Date, default: Date.now, expires: THIRTY_DAYS_SECONDS },
});

module.exports = mongoose.model('GeocodeCache', geocodeCacheSchema);
