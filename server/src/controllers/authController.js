const { matchedData } = require('express-validator');
const authService = require('../services/authService');
const { setAuthCookie, clearAuthCookie } = require('../utils/token');

// Controllers only deal with HTTP: read the validated input, call a service, send the response.
// matchedData() returns only the fields the validation rules declared, nothing else from the body.

async function register(req, res) {
  const user = await authService.register(matchedData(req));
  setAuthCookie(res, user);
  res.status(201).json({ success: true, data: { user } });
}

async function login(req, res) {
  const user = await authService.login(matchedData(req));
  setAuthCookie(res, user);
  res.json({ success: true, data: { user } });
}

function logout(req, res) {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out' });
}

function me(req, res) {
  res.json({ success: true, data: { user: req.user } });
}

module.exports = { register, login, logout, me };
