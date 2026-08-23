const express = require('express');
const {
  adminLogin,
  getAllUsers,
  deleteUser,
  verifyAdminToken,
} = require('../controllers/adminController');
const {
  getAllApplications,
  getApplicationById,
  reviewApplication,
  approveApplication,
  rejectApplication,
  requestInformation,
} = require('../controllers/buyerApplicationController');

const router = express.Router();

// Public route to authenticate admin
router.post('/login', adminLogin);

// Protected routes (Requires valid Admin JWT token)
router.get('/users', verifyAdminToken, getAllUsers);
router.delete('/users/:id', verifyAdminToken, deleteUser);

// Buyer application admin routes
router.get('/buyer-applications', verifyAdminToken, getAllApplications);
router.get('/buyer-applications/:id', verifyAdminToken, getApplicationById);
router.patch('/buyer-applications/:id/review', verifyAdminToken, reviewApplication);
router.patch('/buyer-applications/:id/approve', verifyAdminToken, approveApplication);
router.patch('/buyer-applications/:id/reject', verifyAdminToken, rejectApplication);
router.patch('/buyer-applications/:id/request-information', verifyAdminToken, requestInformation);

module.exports = router;