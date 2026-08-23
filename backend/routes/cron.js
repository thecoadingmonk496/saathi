const express = require('express');
const router = express.Router();
const mandiService = require('../services/mandiService');

// Middleware to verify Vercel Cron requests
const verifyVercelCron = (req, res, next) => {
  // Check either the built-in Vercel cron header or an Authorization bearer token
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (req.headers['x-vercel-cron'] || (authHeader && authHeader === `Bearer ${cronSecret}`)) {
    return next();
  }
  
  // Also allow manual local dev testing if no cron secret is set and we're in dev mode
  if (!cronSecret && process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  return res.status(401).json({ success: false, message: 'Unauthorized cron request' });
};

router.get('/refresh-mandi-cache', verifyVercelCron, async (req, res) => {
  try {
    const startTime = Date.now();
    const result = await mandiService.refreshNationalMandiCache();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        durationMs: duration,
        ...result
      });
    } else {
      return res.status(500).json({
        success: false,
        durationMs: duration,
        ...result
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unexpected error during cron refresh',
      error: error.message
    });
  }
});

module.exports = router;
