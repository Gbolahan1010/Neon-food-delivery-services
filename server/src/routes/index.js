const express = require('express');
const mongoose = require('mongoose');

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

// Phase 2 adds: router.use('/auth', authRoutes);

module.exports = router;
