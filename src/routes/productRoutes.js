const express = require('express');
const { 
  getProductById, 
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getShopProducts,
  toggleProductStatus,
  getFeaturedProducts
} = require('../controllers/productController');
const authMiddleware = require('../middlewares/auth');
const { uploadImage } = require('../services/cloudinary');
const router = express.Router();

// ✅ FIXED: Route order matters! Specific routes FIRST

router.get('/admin', authMiddleware, getAllProducts);
router.get('/', getShopProducts);
router.get('/featured', getFeaturedProducts); 
router.get('/:id', getProductById);


router.post('/admin', authMiddleware, uploadImage, createProduct);
router.put('/admin/:id', authMiddleware, uploadImage, updateProduct);
router.delete('/admin/:id', authMiddleware, deleteProduct);
router.patch('/admin/:id/status', authMiddleware, toggleProductStatus);

module.exports = router;
