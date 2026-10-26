const { matchedData } = require('express-validator');
const menuService = require('../services/menuService');

const bodyData = (req) => matchedData(req, { locations: ['body'] });

async function listForOwner(req, res) {
  const items = await menuService.listForOwner(req.params.id, req.user);
  res.json({ success: true, data: items });
}

async function create(req, res) {
  const item = await menuService.addItem(req.params.id, bodyData(req), req.user);
  res.status(201).json({ success: true, data: item });
}

async function update(req, res) {
  const item = await menuService.updateItem(req.params.itemId, bodyData(req), req.user);
  res.json({ success: true, data: item });
}

async function remove(req, res) {
  await menuService.removeItem(req.params.itemId, req.user);
  res.json({ success: true, message: 'Menu item deleted' });
}

module.exports = { listForOwner, create, update, remove };
