const express = require('express');
const controller = require('../controllers/deliveryController');
const { quoteRules } = require('../validators/deliveryValidators');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Logged-in users only, so the public cannot use our server as a free address-lookup service.
router.post('/quote', protect, quoteRules, validate, controller.quote);

module.exports = router;
