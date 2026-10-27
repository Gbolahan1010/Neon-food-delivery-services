const { geocode } = require('./geoService');

// Delivery pricing: a base fee plus a charge per kilometre, with a ceiling.
const BASE_FEE_CENTS = 199;
const PER_KM_CENTS = 60;
const MAX_FEE_CENTS = 999;
const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/** Straight-line distance between two points on the Earth (the haversine formula). */
function haversineKm(from, to) {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function feeForDistance(distanceKm) {
  return Math.min(MAX_FEE_CENTS, BASE_FEE_CENTS + Math.round(distanceKm * PER_KM_CENTS));
}

/** The restaurant's coordinates; looked up once and saved if the owner never set them. */
async function restaurantLocation(restaurant) {
  const { address } = restaurant;
  if (Number.isFinite(address?.lat) && Number.isFinite(address?.lng)) {
    return { lat: address.lat, lng: address.lng };
  }
  const location = await geocode(address);
  restaurant.set({ 'address.lat': location.lat, 'address.lng': location.lng });
  await restaurant.save();
  return location;
}

/**
 * Works out the delivery distance and fee from a restaurant to a customer's address.
 * The customer's address is always geocoded on the server: coordinates sent by a browser
 * are never trusted, because they decide how much the customer pays.
 */
async function quote(restaurant, address) {
  const [from, to] = await Promise.all([restaurantLocation(restaurant), geocode(address)]);
  const distanceKm = Math.round(haversineKm(from, to) * 10) / 10; // one decimal place
  const maxDistanceKm = restaurant.deliveryRadiusKm;

  return {
    distanceKm,
    maxDistanceKm,
    withinRange: distanceKm <= maxDistanceKm,
    deliveryFeeCents: feeForDistance(distanceKm),
    location: to,
  };
}

module.exports = {
  quote,
  haversineKm,
  feeForDistance,
  BASE_FEE_CENTS,
  PER_KM_CENTS,
  MAX_FEE_CENTS,
};
