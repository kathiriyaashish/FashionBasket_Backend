const Order = require('../models/Order');
const Cart = require('../models/Cart');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');

// ✅ CREATE ORDER - Perfect for your frontend
const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, totalAmount } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart items are required'
      });
    }

    console.log(totalAmount)

    if (!shippingAddress?.street || !shippingAddress?.city ||
      !shippingAddress?.state || !shippingAddress?.pincode) {
      return res.status(400).json({
        success: false,
        message: 'Complete shipping address is required'
      });
    }

    const calculatedTotal = items.reduce((sum, item) => {
      return sum + (Number(item.discountedPrice || 0) * Number(item.quantity || 0));
    }, 0);

    if (Math.abs(calculatedTotal - totalAmount) > 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid total amount'
      });
    }

    const order = new Order({
      user: req.user.userId,
      items: items.map(item => ({
        product: item.product._id || item.product,
        quantity: item.quantity,
        price: item.price,
        discountedPrice: item.discountedPrice,
        size: item.size,
        color: item.color
      })),
      shippingAddress,
      paymentMethod,
      totalAmount: totalAmount,
      status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
      paymentStatus: paymentMethod === 'cod' ? 'paid' : 'pending',
      deliveryPartner: null,
    });

    await order.save();

    // 5. Clear cart
    await Cart.findOneAndUpdate(
      { user: req.user.userId },
      { $set: { items: [], totalAmount: 0 } },
      { upsert: true }
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully!',
      orderId: order._id,
      order
    });

  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order'
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    console.log('👤 User:', req.user);
    console.log('🔑 Headers:', req.headers.authorization);


    const orders = await Order.find({})
      .populate('user', 'name email phone')
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(20);

    console.log('✅ Orders found:', orders.length);

    const formattedOrders = orders.map(order => ({
      _id: order._id.toString(),
      user: order.user,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      shippingAddress: order.shippingAddress,
      deliveryPartner: order.deliveryPartner || null,
      createdAt: order.createdAt,
      items: order.items
    }));

    res.json({
      success: true,
      orders: formattedOrders,
      count: formattedOrders.length
    });

  } catch (error) {
    console.error('❌ FULL ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const updateOrder = async (req, res) => {
  try {
    const { status, deliveryPartner } = req.body;
    const orderId = req.params.id;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        ...(status && { status }),
        ...(deliveryPartner && { deliveryPartner })
      },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      order: {
        _id: order._id.toString(),
        status: order.status,
        deliveryPartner: order.deliveryPartner,
        user: { name: 'Customer' }
      }
    });

  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const TrackOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images price discountedPrice');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

const myOrders = async (req, res) => {
  try {
    console.log('🔍 req.user FULL:', req.user);

    // ✅ SAFETY CHECKS
    if (!req.user) {
      console.log('❌ NO req.user!');
      return res.status(401).json({ success: false, message: 'No user in request' });
    }

    if (!req.user.userId) {
      console.log('❌ NO req.user.userId!', req.user);
      return res.status(401).json({ success: false, message: 'Invalid user data' });
    }

    console.log('🔍 Searching orders for userId:', req.user.userId);

    const orders = await Order.find({ user: req.user.userId })
      .populate('items.product', 'name images price discountedPrice')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log('✅ Orders found:', orders.length);

    res.json({
      success: true,
      orders,
      count: orders.length
    });
  } catch (error) {
    console.error('🚨 MyOrders FULL ERROR:', error);
    console.error('🚨 Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
    }).populate('items.product', 'name images price discountedPrice')
      .populate('user', 'name email phone number');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Find order first
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // ✅ ACTUAL HARD DELETE - PERMANENTLY REMOVE
    await Order.findByIdAndDelete(id);

    console.log(`🗑️ Order PERMANENTLY DELETED: ${id}`);

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('💥 Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete order: ' + error.message
    });
  }
};

const orderStats = async (req, res) => {
  try {
    const match = {
      status: { $ne: 'cancelled' }  
    }

    const stats = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });

    res.json({
      success: true,
      data: {
        totalOrders: stats[0]?.totalOrders || 0,
        totalRevenue: stats[0]?.totalRevenue || 0,
        totalUsers,
        totalProducts
      }
    });
  } catch (error) {
    res.status(500).j
  }
}

const recentOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      deletedAt: null,
      status: { $ne: 'cancelled' }
    })
      .populate('user', 'name email')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('user items totalAmount status paymentMethod createdAt deliveryPartner')

    res.json({
      success: true,
      recentOrders: orders
    })
  } catch (error) {
    console.error('💥 Recent orders error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent orders'
    })
  }
}

module.exports = {
  createOrder,
  getOrderById,
  getAllOrders,
  updateOrder,
  TrackOrder,
  myOrders,
  deleteOrder,
  orderStats,
  recentOrders
};
