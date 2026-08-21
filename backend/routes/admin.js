const express = require('express');
const {
  adminLogin,
  getAllUsers,
  deleteUser,
  verifyAdminToken,
} = require('../controllers/adminController');

const router = express.Router();

// Public route to authenticate admin
router.post('/login', adminLogin);

// Protected routes (Requires valid Admin JWT token)
router.get('/users', verifyAdminToken, getAllUsers);
router.delete('/users/:id', verifyAdminToken, deleteUser);

module.exports = router;
