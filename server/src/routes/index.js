const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./authRoutes');

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
// Phase 3 adds: router.use('/restaurants', ...), router.use('/menu', ...), router.use('/orders', ...)

module.exports = router;
