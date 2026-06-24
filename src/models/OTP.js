const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  mobile: {  // ✅ Changed from email
    type: String,
    required: true,
    unique: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300  // 5 minutes auto-delete
  }
});


module.exports = mongoose.model('OTP', otpSchema);
