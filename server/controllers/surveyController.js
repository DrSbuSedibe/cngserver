const Survey = require('../models/Survey');
const { generateTrackingCode } = require('../utils/trackingCode');
const { generatePDF } = require('../services/pdfService');
const { sendSurveyEmail } = require('../services/emailService');

/**
 * Survey Controller
 * 
 * Handles the complete survey submission workflow:
 * 1. Generate unique tracking code
 * 2. Validate and sanitize input data
 * 3. Save survey to MongoDB
 * 4. Generate professional PDF
 * 5. Email PDF to configured receiver
 * 6. Return success response with tracking code
 */

/**
 * POST /api/surveys
 * Submit a completed survey
 */
const submitSurvey = async (req, res) => {
  try {
    const { criteriaRows, competitors, formData } = req.body;

    // Step 1: Generate unique tracking code
    const trackingCode = await generateTrackingCode();

    // Step 2: Sanitize input data (basic sanitization)
    const sanitizedCriteriaRows = criteriaRows.map((row) => ({
      id: Number(row.id),
      criterion: String(row.criterion).trim(),
      actual: row.actual ? String(row.actual).trim() : '',
      expected: row.expected ? String(row.expected).trim() : '',
      competitor: row.competitor ? String(row.competitor).trim() : '',
      importance: row.importance ? String(row.importance).trim() : '',
    }));

    const sanitizedCompetitors = competitors.map((comp) => ({
      rank: comp.rank ? String(comp.rank).trim() : '',
      name: comp.name ? String(comp.name).trim() : '',
    }));

    const sanitizedFormData = {
      cngRanking: formData.cngRanking || '',
      businessName: formData.businessName || '',
      jobFunction: formData.jobFunction || '',
      jobFunctionOther: formData.jobFunctionOther || '',
      relationship: formData.relationship || '',
      relationshipOther: formData.relationshipOther || '',
      recommendScore: formData.recommendScore || '',
      recommendReason: formData.recommendReason || '',
      afterSalesImportance: formData.afterSalesImportance || '',
      strengths: Array.isArray(formData.strengths) ? formData.strengths : [],
      strengthsOther: formData.strengthsOther || '',
      weaknesses: Array.isArray(formData.weaknesses) ? formData.weaknesses : [],
      weaknessesOther: formData.weaknessesOther || '',
      recommendations: Array.isArray(formData.recommendations) ? formData.recommendations : [],
      recommendationsOther: formData.recommendationsOther || '',
      safetyRecommendations: Array.isArray(formData.safetyRecommendations) ? formData.safetyRecommendations : [],
      safetyRecommendationsOther: formData.safetyRecommendationsOther || '',
      magazines: Array.isArray(formData.magazines) ? formData.magazines : [],
      magazinesOther: formData.magazinesOther || '',
    };

    // Step 3: Create survey data object for PDF generation
    const surveyData = {
      criteriaRows: sanitizedCriteriaRows,
      competitors: sanitizedCompetitors,
      formData: sanitizedFormData,
    };

    // Step 4: Generate PDF
    console.log(`Generating PDF for tracking code: ${trackingCode}`);
    const pdfPath = await generatePDF(surveyData, trackingCode);
    console.log(`PDF generated successfully: ${pdfPath}`);

    // Step 5: Save survey to MongoDB
    const survey = new Survey({
      trackingCode,
      criteriaRows: sanitizedCriteriaRows,
      competitors: sanitizedCompetitors,
      formData: sanitizedFormData,
      pdfPath,
    });

    await survey.save();
    console.log(`Survey saved to MongoDB with tracking code: ${trackingCode}`);

    // Step 6: Send email with PDF attachment
    try {
      await sendSurveyEmail(trackingCode, pdfPath);
      console.log(`Email sent successfully for tracking code: ${trackingCode}`);
    } catch (emailError) {
      // Log email error but don't fail the submission
      // The survey is already saved and PDF generated
      console.error(`Email sending failed for ${trackingCode}:`, emailError.message);
    }

    // Step 7: Return success response
    return res.status(201).json({
      success: true,
      trackingCode,
      message: 'Survey submitted successfully',
    });
  } catch (error) {
    console.error('Survey submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while submitting the survey. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/surveys/:trackingCode
 * Retrieve a survey by tracking code (for verification purposes)
 */
const getSurveyByTrackingCode = async (req, res) => {
  try {
    const { trackingCode } = req.params;

    const survey = await Survey.findOne({ trackingCode });

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Survey not found',
      });
    }

    return res.status(200).json({
      success: true,
      survey: {
        trackingCode: survey.trackingCode,
        submittedDate: survey.submittedDate,
        createdAt: survey.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching survey:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the survey',
    });
  }
};

module.exports = { submitSurvey, getSurveyByTrackingCode };