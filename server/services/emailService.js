const nodemailer = require('nodemailer');
const path = require('path');

/**
 * Email Service - Sends survey PDF via Gmail SMTP using Nodemailer.
 *
 * The receiver email is configured only on the backend via environment variables.
 * It is never exposed to the frontend or the user.
 *
 * Required environment variables:
 *   EMAIL_USER  - Gmail address (falls back to SMTP_EMAIL)
 *   EMAIL_PASS  - 16-character Google App Password (falls back to SMTP_APP_PASSWORD)
 *   RECEIVER_EMAILS - comma-separated recipient list (falls back to RECEIVER_EMAIL)
 *
 * NOTE: EMAIL_PASS MUST be a Google App Password (generated at
 * https://myaccount.google.com/apppasswords) and NOT the normal Gmail password.
 * A normal password will be rejected by Gmail and cause authentication failures.
 */

// ---- Resolve configuration from environment ----
const EMAIL_USER = process.env.EMAIL_USER || process.env.SMTP_EMAIL;
const EMAIL_PASS = process.env.EMAIL_PASS || process.env.SMTP_APP_PASSWORD;
const RECEIVER_EMAILS = process.env.RECEIVER_EMAILS || process.env.RECEIVER_EMAIL;

// Explicit Gmail SMTP transport configuration.
// Using an explicit host/port/secure avoids the deprecated `service: 'gmail'`
// shortcut, which can attempt STARTTLS on port 465 and hang (connection timeout).
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true => SSL/TLS on port 465
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  // Sensible timeouts so a dead connection fails fast instead of hanging.
  connectionTimeout: 30000, // 30s to establish TCP/TLS
  greetingTimeout: 30000, // 30s for SMTP greeting
  socketTimeout: 30000, // 30s of socket inactivity
  pool: false,
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  },
  // Verbose output only in development to aid debugging.
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development',
};

/**
 * Create a Nodemailer transporter using Gmail SMTP (explicit config).
 */
const createTransporter = () => {
  console.log('[EMAIL] Creating Nodemailer transporter for Gmail SMTP (smtp.gmail.com:465, secure=SSL)...');

  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error(
      'Missing email credentials. Set EMAIL_USER/EMAIL_PASS (or SMTP_EMAIL/SMTP_APP_PASSWORD) environment variables.'
    );
  }

  // Warn if the password does not look like a 16-char Google App Password.
  if (EMAIL_PASS && EMAIL_PASS.replace(/\s/g, '').length !== 16) {
    console.warn(
      '[EMAIL] WARNING: EMAIL_PASS does not look like a 16-character Google App Password. ' +
        'Gmail requires an App Password (https://myaccount.google.com/apppasswords), not your normal account password.'
    );
  }

  return nodemailer.createTransport(SMTP_CONFIG);
};

/**
 * Verify the SMTP connection at server startup.
 * Returns true if Gmail is reachable and authentication succeeds.
 */
const verifyEmailConnection = async () => {
  console.log('[EMAIL] Verifying SMTP connection to Gmail...');
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('[EMAIL] ✅ SMTP connection verified — Gmail is reachable and authentication succeeded.');
    return true;
  } catch (err) {
    console.error('[EMAIL] ❌ SMTP verification failed:', err.message);
    console.error(err.stack);
    return false;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send the survey PDF via email with retry logic.
 *
 * @param {string} trackingCode - The unique tracking code
 * @param {string} pdfPath - The file path to the generated PDF
 * @param {number} attempt - Current attempt number (used internally for retries)
 * @returns {Promise<Object>} - The email send result
 * @throws {Error} - Throws if all retry attempts fail (so the caller can return an HTTP error)
 */
const sendSurveyEmail = async (trackingCode, pdfPath, attempt = 1) => {
  const MAX_ATTEMPTS = 3;

  console.log(`[EMAIL] Preparing to send survey email (attempt ${attempt}/${MAX_ATTEMPTS}) for tracking code: ${trackingCode}`);

  if (!RECEIVER_EMAILS) {
    throw new Error('No recipient configured. Set RECEIVER_EMAILS environment variable.');
  }

  const recipients = RECEIVER_EMAILS.split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    throw new Error('RECEIVER_EMAILS contained no valid email addresses.');
  }
  console.log(`[EMAIL] Recipients: ${recipients.join(', ')}`);

  const submittedDate = new Date().toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const mailOptions = {
    from: `"CNG Customer Satisfaction Survey" <${EMAIL_USER}>`,
    to: recipients,
    subject: `New Customer Satisfaction Survey - Tracking Code: ${trackingCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="background-color: #b30015; padding: 15px; border-radius: 5px 5px 0 0; margin: -20px -20px 20px -20px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 18px;">CNG Customer Satisfaction Survey</h2>
        </div>

        <p style="font-size: 14px; color: #333;">A new Customer Satisfaction Survey has been submitted.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr>
            <td style="padding: 8px; background-color: #f5f5f5; font-weight: bold; width: 150px;">Tracking Code:</td>
            <td style="padding: 8px; background-color: #f5f5f5;">${trackingCode}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Submission Date:</td>
            <td style="padding: 8px;">${submittedDate}</td>
          </tr>
        </table>

        <p style="font-size: 14px; color: #333;">The completed survey PDF is attached to this email.</p>

        <div style="background-color: #fdf3f4; padding: 10px; border-left: 4px solid #b30015; margin: 15px 0; font-size: 12px; color: #666;">
          <p style="margin: 0;">This is an automated email from the CNG Customer Satisfaction Survey system.</p>
          <p style="margin: 5px 0 0 0;">Generated by SmartMat Technologies Pty Ltd</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: path.basename(pdfPath),
        path: pdfPath,
      },
    ],
  };

  let transporter;
  try {
    transporter = createTransporter();
    console.log('[EMAIL] Connecting to Gmail SMTP and authenticating...');
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Email sent successfully: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[EMAIL] ❌ Failed to send email (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message}`);
    console.error(err.stack);

    if (attempt < MAX_ATTEMPTS) {
      const backoff = attempt * 2000; // 2s, then 4s
      console.log(`[EMAIL] Retrying in ${backoff}ms...`);
      await sleep(backoff);
      return sendSurveyEmail(trackingCode, pdfPath, attempt + 1);
    }

    // All attempts exhausted — propagate so the controller returns an HTTP error.
    throw err;
  } finally {
    // Release the SMTP connection (resource cleanup).
    if (transporter && typeof transporter.close === 'function') {
      try {
        transporter.close();
      } catch (_) {
        /* ignore close errors */
      }
    }
  }
};

module.exports = { sendSurveyEmail, verifyEmailConnection };