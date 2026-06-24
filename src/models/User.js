const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mobile: { type: String, required: true, unique: true },
  name: { type: String, default: '' },
  email: { type: String, sparse: true },   
  phone: String,                             
  role: { 
    type: String, 
    enum: ['customer', 'admin'], 
    default: 'customer' 
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }, 
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String
  },
  totalOrders: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
