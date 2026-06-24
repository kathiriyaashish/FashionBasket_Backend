const { createRazorpayOrder, verifyPaymentSignature } = require('../services/paymentService');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const Order = require('../models/Order');

class PaymentController {
  static async createPayment(req, res, next) {
    console.log('👤 req.user:', req.user);
    console.log('💰 Frontend total:', req.body.totalAmount);

    try {
      const cart = await Cart.findOne({ user: req.user.userId }).populate('items.product');

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
      }

      // ✅ Frontend total use kar (GST included)
      const amount = req.body.totalAmount || cart.totalAmount;

      const razorpayOrder = await createRazorpayOrder(amount);

      const payment = new Payment({
        user: req.user.userId,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        status: 'created'
      });
      await payment.save();

      console.log('✅ Razorpay order:', razorpayOrder.id);

      res.json({
        success: true,
        payment: {
          id: payment._id.toString(),
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount / 100, // Paise to rupees
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID,
          name: 'Fashion Basket'
        }
      });
    } catch (error) {
      console.error('💥 CREATE PAYMENT ERROR:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

static async verifyPayment(req, res, next) {
  console.log('🔍 VERIFYING PAYMENT:', req.body);
  
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, shippingAddress, paymentMethod } = req.body;

    const orderTotalAmount = req.body.totalAmount;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    // ✅ Signature verification
    const isValidSignature = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    console.log('🔐 Signature valid:', isValidSignature);
    
    if (!isValidSignature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // ✅ Update payment
    const payment = await Payment.findOne({ razorpayOrderId });
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = 'paid';
    await payment.save();

    // ✅ RAZORPAY METHOD MAPPING
    let orderPaymentMethod = 'card';  // Default
    if (paymentMethod === 'upi') {
      orderPaymentMethod = 'upi';
    } else if (paymentMethod === 'netbank') {
      orderPaymentMethod = 'card';
    } else if (paymentMethod === 'wallet') {
      orderPaymentMethod = 'card';
    }
    
    console.log('💳 Detected payment method:', paymentMethod, '→ Order:', orderPaymentMethod);

    // ✅ Get cart
    const cart = await Cart.findOne({ user: req.user.userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart empty' });
    }

    // ✅ Create order with CORRECT method
    const order = new Order({
      user: req.user.userId,
      items: cart.items,
      shippingAddress: shippingAddress || {},
      totalAmount: orderTotalAmount,
      paymentId: payment._id,
      paymentMethod: orderPaymentMethod,  
      paymentStatus: 'paid',
      status: 'confirmed'
    });
    
    await order.save();
    console.log('✅ Order created:', order._id, 'Method:', orderPaymentMethod);

    // ✅ Clear cart
    await Cart.findOneAndUpdate(
      { user: req.user.userId },
      { $set: { items: [], totalAmount: 0 } }
    );

    res.json({
      success: true,
      message: 'Payment successful! Order created.',
      order: { id: order._id, amount: order.totalAmount }
    });

  } catch (error) {
    console.error('💥 VERIFY ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

}

module.exports = PaymentController;
