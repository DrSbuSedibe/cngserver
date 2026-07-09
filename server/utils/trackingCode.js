const Survey = require('../models/Survey');

/**
 * Generate a unique tracking code for each survey submission.
 * Format: CNG-YYYY-NNNNNN (e.g., CNG-2026-000001)
 * 
 * The counter is based on the count of existing surveys for the current year,
 * ensuring codes are sequential and never duplicated.
 */
const generateTrackingCode = async () => {
  const currentYear = new Date().getFullYear();
  
  // Count existing surveys for the current year
  const count = await Survey.countDocuments({
    trackingCode: { $regex: `^CNG-${currentYear}-` }
  });
  
  // Increment and pad to 6 digits
  const nextNumber = count + 1;
  const paddedNumber = String(nextNumber).padStart(6, '0');
  
  return `CNG-${currentYear}-${paddedNumber}`;
};

module.exports = { generateTrackingCode };