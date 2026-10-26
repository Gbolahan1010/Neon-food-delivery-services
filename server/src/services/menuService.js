const MenuItem = require('../models/MenuItem');
const AppError = require('../utils/AppError');
const restaurantService = require('./restaurantService');

/** Every dish on the menu, including unavailable ones (for the owner's dashboard). */
async function listForOwner(restaurantId, user) {
  await restaurantService.getOwned(restaurantId, user);
  return MenuItem.find({ restaurant: restaurantId }).sort({ category: 1, name: 1 });
}

async function addItem(restaurantId, data, user) {
  await restaurantService.getOwned(restaurantId, user); // ownership check
  return MenuItem.create({ ...data, restaurant: restaurantId });
}

/** Loads a menu item and checks the user owns the restaurant it belongs to. */
async function getOwnedItem(itemId, user) {
  const item = await MenuItem.findById(itemId);
  if (!item) throw AppError.notFound('Menu item not found');
  await restaurantService.getOwned(item.restaurant, user);
  return item;
}

async function updateItem(itemId, data, user) {
  const item = await getOwnedItem(itemId, user);
  item.set(data);
  await item.save();
  return item;
}

async function removeItem(itemId, user) {
  const item = await getOwnedItem(itemId, user);
  await item.deleteOne();
}

module.exports = { listForOwner, addItem, updateItem, removeItem };
