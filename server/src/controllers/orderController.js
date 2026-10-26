const { matchedData } = require('express-validator');
const orderService = require('../services/orderService');

async function create(req, res) {
  const order = await orderService.createOrder(matchedData(req, { locations: ['body'] }), req.user);
  res.status(201).json({ success: true, data: order });
}

async function listMine(req, res) {
  const { items, meta } = await orderService.listMine(req.user, req.query);
  res.json({ success: true, data: items, meta });
}

async function getById(req, res) {
  const order = await orderService.getById(req.params.id, req.user);
  res.json({ success: true, data: order });
}

async function listForRestaurant(req, res) {
  const { items, meta } = await orderService.listForRestaurant(req.params.id, req.user, req.query);
  res.json({ success: true, data: items, meta });
}

async function updateStatus(req, res) {
  const { status } = matchedData(req, { locations: ['body'] });
  const order = await orderService.updateStatus(req.params.id, status, req.user);
  res.json({ success: true, data: order });
}

module.exports = { create, listMine, getById, listForRestaurant, updateStatus };
