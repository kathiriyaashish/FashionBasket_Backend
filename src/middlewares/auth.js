const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    // middlewares/auth.js ma ye console add kar
console.log('🔍 TOKEN RECEIVED:', req.header('Authorization')?.slice(0, 20) + '...');

    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied : Login Required', 
      });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user from token
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found.' 
      });
    }
    
    // Attach user to req object
    req.user = {
      userId: user._id,
      email: user.email,
      name: user.name
    };
    
    next(); // Proceed to next middleware/route
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      success: false,
      message: 'Invalid token.' 
    });
  }
};

module.exports = authMiddleware;
