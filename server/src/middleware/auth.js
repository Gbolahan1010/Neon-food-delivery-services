const User = require('../models/User');
const AppError = require('../utils/AppError');
const { COOKIE_NAME, verifyToken } = require('../utils/token');

/**
 * Authentication: only lets the request through if it carries a valid session cookie.
 * Puts the logged-in user on req.user for the next handlers.
 */
async function protect(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw AppError.unauthorized();

  const payload = verifyToken(token); // throws on a tampered or expired token -> 401
  const user = await User.findById(payload.id);
  if (!user || !user.isActive) throw AppError.unauthorized('Your account is no longer available');

  req.user = user;
  next();
}

module.exports = { protect };
