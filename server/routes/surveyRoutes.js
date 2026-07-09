const express = require('express');
const router = express.Router();
const { submitSurvey, getSurveyByTrackingCode } = require('../controllers/surveyController');
const { validateSurvey } = require('../middleware/validation');

/**
 * Survey Routes
 * 
 * POST /api/surveys - Submit a completed survey
 * GET /api/surveys/:trackingCode - Retrieve survey by tracking code
 */

// POST /api/surveys - Submit survey (with validation)
router.post('/', validateSurvey, submitSurvey);

// GET /api/surveys/:trackingCode - Get survey by tracking code
router.get('/:trackingCode', getSurveyByTrackingCode);

module.exports = router;