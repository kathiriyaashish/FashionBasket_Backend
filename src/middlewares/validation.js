const { body, validationResult } = require('express-validator');

const validateEmail = body('email')
  .isEmail().withMessage('Valid email is required')
  .normalizeEmail();

const validateOTP = body('otp')
  .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits');

const validateProduct = [
  body('name').notEmpty().withMessage('Product name required'),
  body('price').isNumeric().withMessage('Price must be number'),
  body('stock').optional().isNumeric().withMessage('Stock must be number')
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = { validateEmail, validateOTP, validateProduct, validate };
