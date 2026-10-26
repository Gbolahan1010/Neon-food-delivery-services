const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/authController');
const { registerRules, loginRules } = require('../validators/authValidators');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isTest } = require('../config/env');

const router = express.Router();

// Slows down password guessing: 20 attempts per IP every 15 minutes.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

// Each route is a pipeline: rate limit -> validation rules -> validate -> controller.
router.post('/register', authLimiter, registerRules, validate, controller.register);
router.post('/login', authLimiter, loginRules, validate, controller.login);
router.post('/logout', controller.logout);
router.get('/me', protect, controller.me);

module.exports = router;
