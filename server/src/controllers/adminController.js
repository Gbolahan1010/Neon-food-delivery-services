const { matchedData } = require('express-validator');
const adminService = require('../services/adminService');

const bodyData = (req) => matchedData(req, { locations: ['body'] });

async function listRestaurants(req, res) {
  const { items, meta } = await adminService.listRestaurants(req.query);
  res.json({ success: true, data: items, meta });
}

async function setRestaurantApproval(req, res) {
  const { isApproved } = bodyData(req);
  const restaurant = await adminService.setRestaurantApproval(req.params.id, isApproved);
  res.json({ success: true, data: restaurant });
}

async function listUsers(req, res) {
  const { items, meta } = await adminService.listUsers(req.query);
  res.json({ success: true, data: items, meta });
}

async function setUserActive(req, res) {
  const { isActive } = bodyData(req);
  const user = await adminService.setUserActive(req.params.id, isActive, req.user);
  res.json({ success: true, data: user });
}

module.exports = { listRestaurants, setRestaurantApproval, listUsers, setUserActive };
