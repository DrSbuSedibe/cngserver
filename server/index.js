const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/db');

// Import routes
const surveyRoutes = require('./routes/surveyRoutes');

// Import email service for provider verification on startup
const { verifyEmailConnection } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (required for Render and other reverse proxies)
app.set('trust proxy', 1);

// =====================
// SECURITY MIDDLEWARE
// =====================

// Helmet - Secure HTTP headers
app.use(helmet());

// CORS - Allow frontend to access the API
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'https://cngsurvey.vercel.app',
  'http://localhost:3000',
  'http://localhost:4173',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // In production, this would reject unknown origins
        // For development, allow all origins
        if (process.env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
  })
);

// Rate limiting - Prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Strict rate limit for survey submissions (prevent duplicate submissions)
const surveyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 survey submissions per hour
  message: {
    success: false,
    message: 'Too many survey submissions. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// =====================
// BODY PARSING
// =====================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================
// STATIC FILES
// =====================

// Serve uploaded PDFs (for development purposes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve built frontend (production)
const clientDist = path.join(__dirname, '..', 'dist');
app.use(express.static(clientDist));

// SPA fallback - serve index.html for all non-API routes
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        message: 'Frontend not built. Run "npm run build" first.',
      });
    }
  });
});

// =====================
// ROUTES
// =====================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Survey routes
app.use('/api/surveys', surveyLimiter, surveyRoutes);

// =====================
// ERROR HANDLING
// =====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// =====================
// DATABASE & SERVER START
// =====================

const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.warn('⚠️  MongoDB connection failed during startup:', error.message);
    console.warn('   The API health endpoint will still be available, but survey submissions may fail until the database is reachable.');
  }

  try {
    await verifyEmailConnection();
    console.log('✅ Email service verified successfully');
  } catch (error) {
    console.warn('⚠️  Email service verification failed:', error.message);
    console.warn('   Survey submissions may fail at the email step.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
========================================
  CNG Survey Server
  Port: ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  Database: MongoDB Atlas
  Email: Provider startup verification enabled
========================================
    `);
  });
};

startServer();

module.exports = app;


