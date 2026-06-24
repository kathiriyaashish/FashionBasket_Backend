const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true, min: 0 },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true  // Sub category (direct category)
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false // Main category (parent)
  },
  images: [String],
  stock: { type: Number, default: 0, min: 0 },
  size: [{ type: String, enum: ['S', 'M', 'L', 'XL', 'XXL'] }],
  color: [String],
  isFeatured: { type: Boolean, default: false },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  isActive: { type: Boolean, default: true }, // ✅ Admin soft delete
}, { timestamps: true });


productSchema.index({ category: 1 });
productSchema.index({ parentCategory: 1 });
productSchema.index({ isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
