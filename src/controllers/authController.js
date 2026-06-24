const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Generate 6 digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ✅ WhatsApp Green API - LIVE!
const sendWhatsAppOTP = async (mobile, otp) => {
  try {
    const response = await axios.post(
      `https://api.green-api.com/waInstance${process.env.GREEN_API_INSTANCE_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`,
      {
        chatId: `91${mobile}@c.us`,
        message: `🎉 Fashion Basket OTP: *${otp}*\n\n⏰ Valid for 5 minutes\n🔒 Do not share with anyone`,
        linkPreview: false
      }
    );
    console.log('✅ WhatsApp SENT:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('❌ WhatsApp Error:', error.response?.data || error.message);
    throw error;
  }
};

// 1. Send OTP via WhatsApp (UNCHANGED - Perfect)
const sendLoginOTP = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: '❌ Enter valid 10-digit mobile number' });
    }

    const otp = generateOTP();

    await OTP.findOneAndUpdate(
      { mobile },
      { mobile, otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    console.log(`🚨 OTP GENERATED: ${otp} for ${mobile}`);

    await sendWhatsAppOTP(mobile, otp);

    res.json({
      message: '✅ WhatsApp OTP sent! Check your WhatsApp.',
      success: true
    });

  } catch (error) {
    console.error('========== OTP ERROR ==========');
    console.error(error);
    console.error(error.message);

    if (error.response) {
      console.error(error.response.data);
    }

    res.status(500).json({
      message: 'WhatsApp failed. Use test OTP from console.',
      success: false,
      error: error.message
    });
  }
};

// 2. Verify OTP (UNCHANGED - Perfect)
const verifyOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp || otp.length !== 6) {
      return res.status(400).json({ message: '❌ Mobile & 6-digit OTP required' });
    }

    const otpRecord = await OTP.findOne({ mobile, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: '❌ Invalid or expired OTP' });
    }

    await OTP.deleteOne({ mobile });
    console.log(`✅ OTP verified & deleted for ${mobile}`);

    let user = await User.findOne({ mobile });
    if (!user) {
      user = new User({
        mobile,
        name: `User_${mobile.slice(-4)}`,
        isVerified: true,
        role: 'customer'
      });
      await user.save();
      console.log(`✅ New user created: ${mobile}`);
    }

    const token = jwt.sign(
      { userId: user._id, mobile: user.mobile },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '🎉 Login successful!',
      success: true,
      token,
      user: {
        id: user._id,
        mobile: user.mobile,
        name: user.name,
        role: user.role || 'customer'
      }
    });

  } catch (error) {
    console.error('Verify Error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

// 3. Profile (UNCHANGED)
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password -__v')
      .lean();

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Profile fetch failed' });
  }
};

// 4. Update Profile (UNCHANGED)
const updateProfile = async (req, res) => {
  try {
    const { name, address } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    if (address) {
      user.address = { ...user.address, ...address };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated!',
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        address: user.address,
        totalOrders: user.totalOrders
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Update failed' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      users: users.map(user => ({
        id: user._id,                    // ✅ Frontend needs 'id'
        _id: user._id,                   // ✅ MongoDB _id
        name: user.name || 'N/A',
        email: user.email || 'N/A',
        phone: user.phone || user.mobile || 'N/A',
        role: user.role || 'customer',
        isActive: user.isActive !== false, // ✅ Default true
        joined: new Date(user.createdAt).toLocaleDateString('en-IN')
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Users fetch failed' });
  }
};


// ✅ NEW: Create Admin User (Admin Only)
const createUser = async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }, { mobile: phone }]
    });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      name,
      email,
      phone,
      mobile: phone,
      role: role || 'customer',
      isVerified: true,
      isActive: true
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ NEW: Update User (Admin Only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.mobile = phone || user.mobile;
    user.role = role || user.role;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ NEW: Delete/Deactivate User (Admin Only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ✅ Soft delete - set inactive
    user.isActive = false;
    await user.save();

    console.log(`✅ User DEACTIVATED: ${user.name} (${id})`);

    res.json({
      success: true,
      message: 'User deactivated successfully!'
    });
  } catch (error) {
    console.error('❌ Delete Error:', error);
    res.status(500).json({ message: 'Delete failed - Check console' });
  }
};


// ✅ NEW: Toggle User Status (Admin Only)
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: 'Status updated!',
      user: {
        id: user._id,
        name: user.name,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Status update failed' });
  }
};

module.exports = {
  sendLoginOTP,
  verifyOTP,
  getProfile,
  updateProfile,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
};
