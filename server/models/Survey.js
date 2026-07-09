const mongoose = require('mongoose');

/**
 * Survey Schema - Stores all survey submissions
 * 
 * Fields:
 * - trackingCode: Unique auto-generated code (e.g., CNG-2026-000001)
 * - submittedDate: Date of submission
 * - criteriaRows: Performance matrix data (40 criteria items)
 * - competitors: Competitive landscape data
 * - formData: General questions and strategic insights
 * - pdfPath: Path to the generated PDF file
 * - submittedAt: Timestamp of submission
 */
const surveySchema = new mongoose.Schema(
  {
    trackingCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    submittedDate: {
      type: Date,
      default: Date.now,
    },
    criteriaRows: [
      {
        id: Number,
        criterion: String,
        actual: { type: String, default: '' },
        expected: { type: String, default: '' },
        competitor: { type: String, default: '' },
        importance: { type: String, default: '' },
      },
    ],
    competitors: [
      {
        rank: { type: String, default: '' },
        name: { type: String, default: '' },
      },
    ],
    formData: {
      cngRanking: { type: String, default: '' },
      jobFunction: { type: String, default: '' },
      jobFunctionOther: { type: String, default: '' },
      relationship: { type: String, default: '' },
      relationshipOther: { type: String, default: '' },
      recommendScore: { type: String, default: '' },
      recommendReason: { type: String, default: '' },
      afterSalesImportance: { type: String, default: '' },
      strengths: [{ type: String }],
      strengthsOther: { type: String, default: '' },
      weaknesses: [{ type: String }],
      weaknessesOther: { type: String, default: '' },
      recommendations: [{ type: String }],
      recommendationsOther: { type: String, default: '' },
      safetyRecommendations: [{ type: String }],
      safetyRecommendationsOther: { type: String, default: '' },
      magazines: [{ type: String }],
      magazinesOther: { type: String, default: '' },
    },
    pdfPath: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Survey', surveySchema);