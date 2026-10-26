const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./authRoutes');
const restaurantRoutes = require('./restaurantRoutes');
const menuRoutes = require('./menuRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/restaurants', restaurantRoutes);
router.use(menuRoutes); // /restaurants/:id/menu and /menu/:itemId

module.exports = router;
