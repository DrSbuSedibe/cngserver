const { body, validationResult } = require('express-validator');

/**
 * Validation middleware for survey submission
 */
const validateSurvey = [
  // Validate criteriaRows
  body('criteriaRows')
    .isArray()
    .withMessage('criteriaRows must be an array')
    .notEmpty()
    .withMessage('criteriaRows cannot be empty'),

  body('criteriaRows.*.id')
    .isNumeric()
    .withMessage('Each criterion must have a numeric id'),

  body('criteriaRows.*.criterion')
    .isString()
    .withMessage('Each criterion must have a text description'),

  // Validate competitors
  body('competitors')
    .isArray()
    .withMessage('competitors must be an array'),

  // Validate formData
  body('formData')
    .isObject()
    .withMessage('formData must be an object'),

  // Handle validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((err) => ({
          field: err.path,
          message: err.msg,
        })),
      });
    }
    next();
  },
];

module.exports = { validateSurvey };