const express = require('express');
const controller = require('../controllers/menuController');
const { createMenuItemRules, updateMenuItemRules } = require('../validators/menuValidators');
const { idParam } = require('../validators/common');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

// Menu management is for restaurant owners (and admins).
// Customers see a restaurant's menu through GET /api/restaurants/:id.
// The guard is added per route (not router.use) because this router is mounted at /api,
// and a router-wide guard would also run for unrelated URLs.
const ownerOnly = [protect, authorize('owner', 'admin')];

router.get('/restaurants/:id/menu', ownerOnly, idParam(), validate, controller.listForOwner);
router.post(
  '/restaurants/:id/menu',
  ownerOnly,
  idParam(),
  createMenuItemRules,
  validate,
  controller.create
);
router.put(
  '/menu/:itemId',
  ownerOnly,
  idParam('itemId'),
  updateMenuItemRules,
  validate,
  controller.update
);
router.delete('/menu/:itemId', ownerOnly, idParam('itemId'), validate, controller.remove);

module.exports = router;
