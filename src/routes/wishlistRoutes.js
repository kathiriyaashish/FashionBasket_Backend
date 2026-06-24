const express = require('express');
const authMiddleware = require('../middlewares/auth');
const { addToWishlist, getWishlist, removeFromWishlist } = require('../controllers/wishlistController');
const router = express.Router();

router.use(authMiddleware);
router.post('/', addToWishlist);
router.get('/', getWishlist);
router.delete('/:productId', removeFromWishlist);

module.exports = router;
