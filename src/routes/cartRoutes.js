const express = require('express');
const authMiddleware = require('../middlewares/auth');
const { addToCart, getCart, removeFromCart, updateCart } = require('../controllers/cartController');
const router = express.Router();

router.use(authMiddleware);
router.post('/', addToCart);
router.get('/', getCart);
router.delete('/:itemId', removeFromCart);
router.put('/:itemId/quantity', updateCart);

module.exports = router;
