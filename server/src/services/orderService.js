const mongoose = require('mongoose');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const AppError = require('../utils/AppError');
const restaurantService = require('./restaurantService');
const deliveryService = require('./deliveryService');
const { getPagination, pageMeta } = require('../utils/pagination');

const euro = (cents) => `€${(cents / 100).toFixed(2)}`;

async function createOrder(data, user) {
  const restaurant = await Restaurant.findById(data.restaurantId);
  if (!restaurant || !restaurant.isApproved) throw AppError.notFound('Restaurant not found');
  if (!restaurant.isOpen)
    throw AppError.badRequest('This restaurant is not taking orders right now');

  // Combine repeated lines for the same dish: [{a,1},{a,2}] -> a x3
  const quantities = new Map();
  for (const { menuItemId, quantity } of data.items) {
    const id = menuItemId.toLowerCase();
    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }

  // Look up every dish in the database. mongoose.trusted marks our own $in as safe
  // (sanitizeFilter would otherwise neutralise it like a user-supplied operator).
  const menuItems = await MenuItem.find({
    _id: mongoose.trusted({ $in: [...quantities.keys()] }),
    restaurant: restaurant._id,
    isAvailable: true,
  });
  if (menuItems.length !== quantities.size) {
    throw AppError.badRequest('Some items are unavailable or not from this restaurant');
  }

  // Prices come from the database, and name + price are copied into the order.
  const items = menuItems.map((item) => ({
    menuItem: item._id,
    name: item.name,
    priceCents: item.priceCents,
    quantity: quantities.get(item._id.toString()),
  }));
  const subtotalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

  if (subtotalCents < restaurant.minimumOrderCents) {
    throw AppError.badRequest(`The minimum order here is ${euro(restaurant.minimumOrderCents)}`);
  }

  // Look up the delivery address and charge by distance (OpenStreetMap Nominatim).
  const delivery = await deliveryService.quote(restaurant, data.deliveryAddress);
  if (!delivery.withinRange) {
    throw AppError.badRequest(
      `That address is ${delivery.distanceKm} km away. This restaurant delivers up to ${delivery.maxDistanceKm} km.`
    );
  }

  return Order.create({
    customer: user._id,
    restaurant: restaurant._id,
    items,
    subtotalCents,
    deliveryFeeCents: delivery.deliveryFeeCents,
    totalCents: subtotalCents + delivery.deliveryFeeCents,
    deliveryDistanceKm: delivery.distanceKm,
    deliveryAddress: {
      ...data.deliveryAddress,
      lat: delivery.location.lat,
      lng: delivery.location.lng,
    },
    notes: data.notes,
    statusHistory: [{ status: 'placed' }],
  });
}

async function listMine(user, query) {
  const { page, limit, skip } = getPagination(query);
  const filter = { customer: user._id };
  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('restaurant', 'name imageUrl'),
    Order.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, { page, limit }) };
}

/** Visible to the customer who placed it, the restaurant's owner, and admins. */
async function getById(id, user) {
  const order = await Order.findById(id).populate('restaurant', 'name imageUrl owner');
  if (!order) throw AppError.notFound('Order not found');

  const isCustomer = order.customer.equals(user._id);
  const isOwner = order.restaurant && order.restaurant.owner.equals(user._id);
  if (user.role !== 'admin' && !isCustomer && !isOwner) {
    throw AppError.forbidden('You cannot view this order');
  }
  return order;
}

async function listForRestaurant(restaurantId, user, query) {
  await restaurantService.getOwned(restaurantId, user);
  const { page, limit, skip } = getPagination(query, { defaultLimit: 20 });
  const filter = { restaurant: restaurantId };
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name phone'),
    Order.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, { page, limit }) };
}

/**
 * Who may change the status:
 *  - the restaurant owner (and admins) move it along the lifecycle
 *  - the customer may only cancel, and only while it is still "placed"
 * The Order model's state machine decides which moves are valid.
 */
async function updateStatus(id, nextStatus, user) {
  const order = await Order.findById(id);
  if (!order) throw AppError.notFound('Order not found');

  const restaurant = await Restaurant.findById(order.restaurant);
  const isAdmin = user.role === 'admin';
  const isOwner = restaurant && restaurant.owner.equals(user._id);
  const isCustomer = order.customer.equals(user._id);

  if (!isAdmin && !isOwner && !(isCustomer && nextStatus === 'cancelled')) {
    throw AppError.forbidden('You cannot change this order to that status');
  }
  if (!order.canTransitionTo(nextStatus)) {
    throw AppError.badRequest(`An order that is ${order.status} cannot be moved to ${nextStatus}`);
  }

  order.status = nextStatus;
  order.statusHistory.push({ status: nextStatus });
  await order.save();
  return order;
}

module.exports = { createOrder, listMine, getById, listForRestaurant, updateStatus };
