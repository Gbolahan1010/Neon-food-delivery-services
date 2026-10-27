const express = require('express');
const controller = require('../controllers/paymentController');
const { checkoutRules, confirmRules } = require('../validators/paymentValidators');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

router.use(protect, authorize('customer'));

router.post('/checkout', checkoutRules, validate, controller.createCheckout);
router.get('/confirm', confirmRules, validate, controller.confirm);

// The webhook (POST /api/payments/webhook) is mounted separately in app.js,
// because it must read the raw request body before express.json() parses it.

module.exports = router;
