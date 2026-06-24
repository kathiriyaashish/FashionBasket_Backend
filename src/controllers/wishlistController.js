const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// 1. Add to Wishlist
const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    
    let wishlist = await Wishlist.findOne({ user: req.user.userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user.userId, products: [] });
    }
    
    // Check if already exists
    if (!wishlist.products.includes(productId)) {
      wishlist.products.push(productId);
      await wishlist.save();
    }
    
    res.json({ 
      success: true, 
      message: 'Added to wishlist' 
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Wishlist
const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.userId })
      .populate('products');
    
    res.json({ 
      success: true, 
      wishlist: wishlist || { products: [] } 
    });
  } catch (error) {
    next(error);
  }
};

// 3. Remove from Wishlist (Line 9 માં આ function જોઈએ!)
const removeFromWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.userId });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    
    wishlist.products = wishlist.products.filter(
      productId => productId.toString() !== req.params.productId
    );
    
    await wishlist.save();
    
    res.json({ 
      success: true, 
      message: 'Removed from wishlist' 
    });
  } catch (error) {
    next(error);
  }
};

// ✅ EXPORT ALL FUNCTIONS
module.exports = { 
  addToWishlist, 
  getWishlist, 
  removeFromWishlist 
};
