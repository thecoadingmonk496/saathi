const express = require('express');
const { registerUser, loginUser, sendOtp, verifyOtp, updateProfile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.put('/profile', requireAuth, updateProfile);

module.exports = router;
