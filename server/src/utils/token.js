const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn, isProd, cookieSameSite } = require('../config/env');

const COOKIE_NAME = 'token';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// httpOnly: page JavaScript cannot read the token, so an XSS bug cannot steal it.
// secure: only sent over HTTPS in production. sameSite: limits cross-site sending (CSRF defence).
const baseCookieOptions = {
  httpOnly: true,
  secure: isProd || cookieSameSite === 'none',
  sameSite: cookieSameSite,
  path: '/',
};

function signToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, jwtSecret, {
    expiresIn: jwtExpiresIn,
    algorithm: 'HS256',
  });
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
}

function setAuthCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), { ...baseCookieOptions, maxAge: ONE_DAY_MS });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, baseCookieOptions);
}

module.exports = { COOKIE_NAME, signToken, verifyToken, setAuthCookie, clearAuthCookie };
