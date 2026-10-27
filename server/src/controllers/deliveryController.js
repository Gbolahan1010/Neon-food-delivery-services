const { matchedData } = require('express-validator');
const Restaurant = require('../models/Restaurant');
const AppError = require('../utils/AppError');
const deliveryService = require('../services/deliveryService');

/** Lets the checkout page show the delivery fee before the customer places the order. */
async function quote(req, res) {
  const { restaurantId, address } = matchedData(req, { locations: ['body'] });
  const restaurant = await Restaurant.findOne({ _id: restaurantId, isApproved: true });
  if (!restaurant) throw AppError.notFound('Restaurant not found');

  const result = await deliveryService.quote(restaurant, address);
  res.json({ success: true, data: result });
}

module.exports = { quote };
