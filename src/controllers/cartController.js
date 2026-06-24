const Cart = require('../models/Cart');
const Product = require('../models/Product');

// 1. Add to Cart


const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, size, color } = req.body;

    
    let cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      cart = new Cart({ user: req.user.userId, items: [] });
    }

    
    const product = await Product.findById(productId).select('stock price discount');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }

    
    const discountedPrice = product.discount > 0
      ? Math.round(product.price * (1 - product.discount / 100))
      : product.price;

    
    const itemIndex = cart.items.findIndex(item =>
      item.product.toString() === productId && item.size === size
    );

    if (itemIndex > -1) {
     
      const newQuantity = cart.items[itemIndex].quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} items available`
        });
      }
      cart.items[itemIndex].quantity = newQuantity;
      
    } else {
      
      cart.items.push({
        product: productId,
        images:Array[product.images],
        quantity,
        size,
        color,
        price : product.price,
        discountedPrice : discountedPrice || 0,       
        discount: product.discount || 0  
      });
    }

    
    cart.totalAmount = cart.items.reduce((sum, item) =>
      sum + (item.quantity * item.discountedPrice), 0
    );

    await cart.save();
    await cart.populate('items.product', 'name price images stock discount size color');

    res.json({
      success: true,
      message: 'Item added to cart',
      cart: {
        items: cart.items,
        totalAmount: cart.totalAmount,
        totalItems: cart.items.length
      }
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    next(error);
  }
};

// 2. Get Cart - PERFECT
const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId })
      .populate('items.product', 'name price images stock discount');
    
    res.json({
      success: true,
      cart: cart || { items: [], totalAmount: 0, totalItems: 0 }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Remove from Cart
const removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId });
    if (!cart || cart.items.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(item => item._id.toString() !== req.params.itemId);
    
    // If no items left, set total to 0
    cart.totalAmount = cart.items.length > 0 
      ? cart.items.reduce((sum, item) => sum + (item.quantity * item.discountedPrice), 0)
      : 0;

    await cart.save();
    
    res.json({ 
      success: true, 
      message: 'Item removed successfully',
      cart: {
        items: cart.items,
        totalAmount: cart.totalAmount,
        totalItems: cart.items.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update Cart Item - PERFECT
const updateCart = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quantity must be at least 1' 
      });
    }

    const cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    const cartItem = cart.items[itemIndex];
    const product = await Product.findById(cartItem.product).select('stock');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }

    cart.items[itemIndex].quantity = quantity;
    cart.totalAmount = cart.items.reduce((sum, item) => 
      sum + (item.quantity * item.discountedPrice), 0
    );

    await cart.save();
    await cart.populate('items.product', 'name price images stock discount');

    res.json({
      success: true,
      message: 'Cart updated successfully',
      cart: {
        items: cart.items,
        totalAmount: cart.totalAmount,
        totalItems: cart.items.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addToCart,
  getCart,
  removeFromCart,
  updateCart
};
