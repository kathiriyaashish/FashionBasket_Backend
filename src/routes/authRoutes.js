const express = require('express');
const auth  = require('../middlewares/auth');
const { 
  sendLoginOTP, verifyOTP, getProfile, updateProfile,
  getAllUsers, createUser, updateUser, deleteUser, toggleUserStatus 
} = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/send-otp', sendLoginOTP);
router.post('/verify-otp', verifyOTP);

// Protected routes
router.get('/profile', auth, getProfile);
router.post('/update-profile', auth, updateProfile);

// ✅ ADMIN ONLY routes
router.get('/users', auth, getAllUsers);
router.post('/users', auth, createUser);
router.put('/users/:id', auth, updateUser);
router.delete('/users/:id', auth, deleteUser);
router.patch('/users/:id/status', auth, toggleUserStatus);

module.exports = router;
