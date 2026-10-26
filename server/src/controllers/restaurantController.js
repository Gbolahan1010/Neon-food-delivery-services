const { matchedData } = require('express-validator');
const restaurantService = require('../services/restaurantService');

const bodyData = (req) => matchedData(req, { locations: ['body'] });

async function list(req, res) {
  const { items, meta } = await restaurantService.listPublic(req.query);
  res.json({ success: true, data: items, meta });
}

async function getById(req, res) {
  const data = await restaurantService.getPublicById(req.params.id);
  res.json({ success: true, data });
}

async function listMine(req, res) {
  const restaurants = await restaurantService.listMine(req.user);
  res.json({ success: true, data: restaurants });
}

async function create(req, res) {
  const restaurant = await restaurantService.create(bodyData(req), req.user);
  res.status(201).json({ success: true, data: restaurant });
}

async function update(req, res) {
  const restaurant = await restaurantService.update(req.params.id, bodyData(req), req.user);
  res.json({ success: true, data: restaurant });
}

async function remove(req, res) {
  await restaurantService.remove(req.params.id, req.user);
  res.json({ success: true, message: 'Restaurant deleted' });
}

module.exports = { list, getById, listMine, create, update, remove };
