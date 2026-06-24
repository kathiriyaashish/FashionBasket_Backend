const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ✅ CREATE RAZORPAY ORDER
const createRazorpayOrder = async (amount) => {
  try {
    const order = await razorpayInstance.orders.create({
      amount: amount * 100, // Paise ma
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    });
    return order;
  } catch (error) {
    console.error('Razorpay order error:', error);
    throw error;
  }
};

// ✅ VERIFY PAYMENT SIGNATURE
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${orderId}|${paymentId}`);
    const generatedSignature = shasum.digest('hex');
    
    console.log('🔐 Expected:', generatedSignature.slice(0, 10));
    console.log('🔐 Received:', signature.slice(0, 10));
    
    return generatedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature
};
