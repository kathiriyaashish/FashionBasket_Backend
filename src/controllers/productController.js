const Product = require('../models/Product');
const Category = require('../models/Category');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ✅ Fetch product with category population
    const product = await Product.findOne({ 
      _id: id, 
      isActive: true 
    })
      .populate('category', 'name')
      .populate('parentCategory', 'name')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or inactive'
      });
    }

    // ✅ Transform YOUR exact schema fields for frontend
    const transformedProduct = {
      _id: product._id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      discount: product.discount || 0,
      // ✅ discountPrice calculated
      discountPrice: product.price - (product.price * (product.discount || 0) / 100),
      stock: product.stock || 0,
      images: product.images || [],
      size: product.size || [],        // ✅ YOUR 'size' array field
      color: product.color || [],      // ✅ YOUR 'color' array field
      isFeatured: product.isFeatured || false,
      isActive: product.isActive,
      brand: product.brand || '',
      // ✅ Category info
      category: product.category?.name || '',
      parentCategory: product.parentCategory?.name || '',
      // ✅ Frontend-friendly fields
      rating: product.rating || 4.5,   // Default if not in schema
      reviews: product.reviews || 0,   // Default if not in schema
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    res.json({
      success: true,
      product: transformedProduct
    });

  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};



const getShopProducts = async (req, res) => {
  try {
    const {
      search, category, minPrice, maxPrice, page = 1, limit = 12, sort = 'newest'
    } = req.query

    const query = { isActive: true }

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    // Category (multiple categories)
    if (category) {
      const categoryIds = category.split(',').filter(Boolean)
      query.$or = [
        ...(query.$or || []),
        { category: { $in: categoryIds } },
        { parentCategory: { $in: categoryIds } }
      ]
    }

    // ✅ FIXED: Price range from frontend
    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) query.price.$gte = parseFloat(minPrice)
      if (maxPrice) query.price.$lte = parseFloat(maxPrice)
    }

    const sortOptions = {
      'newest': { createdAt: -1 },
      'price-low': { price: 1 },
      'price-high': { price: -1 },
      'rating': { rating: -1 }
    }

    const products = await Product.find(query)
      .populate([
        { path: 'category', select: 'name _id' },
        { path: 'parentCategory', select: 'name _id' }
      ])
      .sort(sortOptions[sort] || { createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean()

    const total = await Product.countDocuments(query)

    res.json({
      success: true,
      products: products.map(p => ({
        id: p._id,
        _id: p._id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        originalPrice: p.price, // Before discount
        discountedPrice: p.price * (1 - (p.discount || 0) / 100),
        discount: p.discount || 0,
        stock: p.stock,
        isActive: Boolean(p.isActive),
        isFeatured: Boolean(p.isFeatured),
        rating: p.rating || 0,
        categoryId: p.category?._id,
        categoryName: p.category?.name,
        parentCategoryId: p.parentCategory?._id,
        parentCategoryName: p.parentCategory?.name,
        images: p.images || [],
        size: p.size || [],
        color: p.color || []
      })),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    })
  } catch (error) {
    console.error('Shop Products Error:', error)
    res.status(500).json({ message: 'Products fetch failed' })
  }
}

const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 12, page = 1 } = req.query;
    
    const products = await Product.find({ isFeatured: true, isActive: true }) // ✅ Add isActive
      .populate([
        { path: 'category', select: 'name slug' },
        { path: 'parentCategory', select: 'name' } // ✅ Match your schema
      ])
      .sort({ createdAt: -1 }) 
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // ✅ TRANSFORM SAME AS getShopProducts (Frontend expects this format)
    const transformedProducts = products.map(p => ({
      _id: p._id,
      name: p.name,
      description: p.description || '',
      price: p.price,
      discount: p.discount || 0,
      discountedPrice: p.price * (1 - (p.discount || 0) / 100),
      stock: p.stock || 0,
      images: p.images || [],
      size: p.size || [],
      color: p.color || [],
      isFeatured: Boolean(p.isFeatured),
      rating: p.rating || 4.2,
      category: p.category?.name || '',
      parentCategory: p.parentCategory?.name || ''
    }));

    res.json({
      success: true,
      products: transformedProducts,  // ✅ Frontend expects products array
      pagination: {
        total: products.length,
        limit: parseInt(limit),
        page: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Featured products error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch featured products' });
  }
};




const getAllProducts = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .populate([
        { path: 'category', select: 'name _id' },
        { path: 'parentCategory', select: 'name _id' }
      ])
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products: products.map(p => ({
        id: p._id,
        _id: p._id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        stock: p.stock,
        status: p.stock > 0 ? 'Active' : 'Out of Stock',
        discount: p.discount || 0,  // ✅ FIXED
        isFeatured: p.isFeatured || false,
        categoryId: p.category?._id,
        categoryName: p.category?.name,
        parentCategoryId: p.parentCategory?._id,
        parentCategoryName: p.parentCategory?.name,
        images: p.images || [],
        size: p.size || [],
        color: p.color || [],
        createdAt: p.createdAt
      })),
      total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'Fetch failed', error: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category, parentCategory, size, color, images, isFeatured, discount } = req.body;

    const productData = {
      name: name.trim(),
      description: description?.trim() || '',
      price: parseFloat(price),
      stock: parseInt(stock),
      category,
      parentCategory: parentCategory || undefined,
      size: Array.isArray(size) ? size : [],
      color: Array.isArray(color) ? color : [],
      images: Array.isArray(images) ? images : [],
      isFeatured: Boolean(isFeatured),
      discount: parseInt(discount) || 0,  // ✅ FIXED
      isActive: true
    };

    const product = new Product(productData);
    await product.save();

    res.status(201).json({ success: true, productId: product._id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ FIXED: Update controller
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('🔄 UPDATE DATA:', updateData); // Debug

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        name: updateData.name?.trim(),
        description: updateData.description?.trim(),
        price: updateData.price ? parseFloat(updateData.price) : undefined,
        stock: updateData.stock ? parseInt(updateData.stock) : undefined,
        category: updateData.category,
        parentCategory: updateData.parentCategory || undefined,
        size: Array.isArray(updateData.size) ? updateData.size : undefined,
        color: Array.isArray(updateData.color) ? updateData.color : undefined,
        images: Array.isArray(updateData.images) ? updateData.images : undefined,
        isFeatured: updateData.isFeatured !== undefined ? Boolean(updateData.isFeatured) : undefined,
        discount: updateData.discount !== undefined ? parseInt(updateData.discount) : undefined  // ✅ FIXED
      },
      {
        new: true,
        runValidators: true,
        populate: [
          { path: 'category', select: 'name _id' },
          { path: 'parentCategory', select: 'name _id' }
        ]
      }
    );

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({
      success: true,
      message: 'Product updated!',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;  // ✅ FIXED

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    res.json({ success: true, message: 'Deleted!' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
};

// ✅ 6-7. Delete + Toggle (unchanged)
const deactiveProduct = async (req, res) => {
  try {
    const { id } = req.params.id;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.isActive = false;
    await product.save();

    console.log(`✅ Product DEACTIVATED: ${product.name}`);
    res.json({ success: true, message: 'Product deactivated!' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
};

const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.isActive = !product.isActive;
    await product.save();

    res.json({
      success: true,
      message: 'Status updated!',
      status: product.isActive ? 'Active' : 'Inactive'
    });
  } catch (error) {
    res.status(500).json({ message: 'Status update failed' });
  }
};

module.exports = {
  getProductById,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  getShopProducts,
  getFeaturedProducts
};
