const express = require('express');
const authMiddleware = require('../middlewares/auth');
const PaymentController = require('../controllers/paymentController');
const router = express.Router();

router.use(authMiddleware);
router.post('/create', PaymentController.createPayment);
router.post('/verify', PaymentController.verifyPayment);

module.exports = router;
