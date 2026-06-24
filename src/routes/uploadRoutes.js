const express = require('express');
const authMiddleware = require('../middlewares/auth');
const { uploadImage } = require('../services/cloudinary'); // Your service
const router = express.Router();

// ✅ FIXED ROUTE - Use uploadImage middleware correctly
router.post('/images', authMiddleware, uploadImage, (req, res) => {
  // req.imageUrl is now set by your middleware!
  if (!req.imageUrl) {
    return res.status(400).json({ 
      success: false, 
      message: 'No image uploaded or upload failed' 
    });
  }

  res.json({ 
    success: true, 
    url: req.imageUrl 
  });
});

module.exports = router;
