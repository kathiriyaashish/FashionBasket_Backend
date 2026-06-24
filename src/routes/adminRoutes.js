const express = require('express');
const adminAuth = require('../middlewares/adminAuth');
const { getProfile } = require('../controllers/authController'); // Reuse profile
const { orderStats, recentOrders } = require('../controllers/orderController');
const authMiddleware = require('../middlewares/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// ✅ All admin routes protected
router.use(adminAuth);

// Admin Dashboard
router.get('/dashboard', (req, res) => {
  res.json({
    message: 'Admin Dashboard',
    user: req.user
  });
});

// Admin Pages (Your existing pages)
router.get('/stats', authMiddleware, adminController.getStats);
router.get('/charts', authMiddleware, adminController.getChartData);
router.get('/recent-orders', authMiddleware, adminController.getRecentOrders);
router.get('/categories', (req, res) => res.json({ data: [] }));
router.get('/products', (req, res) => res.json({ data: [] }));
router.get('/orders', (req, res) => res.json({ data: [] }));
router.get('/users', (req, res) => res.json({ data: [] }));

module.exports = router;
