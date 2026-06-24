// controllers/categoryController.js
const Category = require('../models/Category');

const getCategories = async (req, res) => {
  try {
    // ✅ Get ALL categories + populate sub-categories
    const categories = await Category.find({})
      .populate({
        path: 'parentCategory',
        populate: {
          path: 'parentCategory' // Grandparent for deeper nesting
        }
      })
      .sort({ name: 1 });

    // ✅ Transform: Main categories + their subcategories
    const mainCategories = categories.filter(cat => !cat.parentCategory);
    const mainWithSubs = mainCategories.map(mainCat => ({
      ...mainCat._doc,
      subCategories: categories.filter(sub => 
        sub.parentCategory?._id.toString() === mainCat._id.toString()
      )
    }));

    res.json({ 
      success: true, 
      categories: mainWithSubs 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create with parent support
const createCategory = async (req, res) => {
  try {
    const { name, slug, parentCategory } = req.body;
    
    // ✅ Check if parent exists
    if (parentCategory) {
      const parent = await Category.findById(parentCategory);
      if (!parent) {
        return res.status(400).json({ message: 'Parent category not found' });
      }
    }

    const category = new Category({ 
      name, 
      slug: slug.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      parentCategory 
    });
    
    await category.save();
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};



const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (updates.slug) {
      updates.slug = updates.slug.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
    
    const category = await Category.findByIdAndUpdate(id, updates, { new: true });
    res.json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await Category.findByIdAndDelete(id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
