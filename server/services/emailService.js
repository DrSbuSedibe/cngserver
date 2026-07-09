const fs = require('fs/promises');
const nodemailer = require('nodemailer');
const path = require('path');

const EMAIL_USER = process.env.EMAIL_USER || process.env.SMTP_EMAIL;
const EMAIL_PASS = process.env.EMAIL_PASS || process.env.SMTP_APP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || (EMAIL_USER ? `"CNG Customer Satisfaction Survey" <${EMAIL_USER}>` : undefined);
const RECEIVER_EMAILS = process.env.RECEIVER_EMAILS || process.env.RECEIVER_EMAIL;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_RETRY_ATTEMPTS = Number(process.env.SMTP_RETRY_ATTEMPTS || 3);

const redactEmail = (email) => {
  if (!email || !email.includes('@')) return 'not configured';
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
};

const normalizePassword = (password) => (password || '').replace(/\s/g, '');

const getSecureForPort = (port) => {
  if (port === 465) return true;
  if (port === 587) return false;
  return SMTP_SECURE;
};

const getRecipients = () => {
  const recipients = (RECEIVER_EMAILS || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    throw new Error('Missing recipients. Set RECEIVER_EMAILS in Render environment variables.');
  }

  return recipients;
};

const logEmailConfig = () => {
  console.log('[EMAIL] Gmail SMTP Configuration:');
  console.log(`[EMAIL] EMAIL_USER: ${redactEmail(EMAIL_USER)}`);
  console.log(`[EMAIL] EMAIL_PASS: ${EMAIL_PASS ? 'configured' : 'missing'}`);
  console.log(`[EMAIL] EMAIL_FROM: ${EMAIL_FROM || 'missing'}`);
  console.log(`[EMAIL] RECEIVER_EMAILS: ${RECEIVER_EMAILS ? 'configured' : 'missing'}`);
  console.log(`[EMAIL] SMTP_HOST: ${SMTP_HOST}`);
  console.log(`[EMAIL] SMTP_PORT: ${SMTP_PORT}`);
  console.log(`[EMAIL] SMTP_SECURE: ${SMTP_SECURE}`);
};

const validateSmtpConfig = () => {
  logEmailConfig();

  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('Missing Gmail credentials. Set EMAIL_USER and EMAIL_PASS in Render environment variables.');
  }

  const normalizedPass = normalizePassword(EMAIL_PASS);
  if (normalizedPass.length !== 16) {
    throw new Error(
      'EMAIL_PASS must be a 16-character Google App Password, not the normal Gmail account password. Generate it at https://myaccount.google.com/apppasswords.'
    );
  }

  getRecipients();
};

const getTransportConfig = (port = SMTP_PORT) => ({
  host: SMTP_HOST,
  port,
  secure: getSecureForPort(port),
  requireTLS: port === 587,
  auth: {
    user: EMAIL_USER,
    pass: normalizePassword(EMAIL_PASS),
  },
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 20000),
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 15000),
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 30000),
  tls: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  },
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development',
});

const classifyEmailError = (error) => {
  const code = error && (error.code || error.command || error.responseCode);
  const message = error && error.message ? error.message : 'Unknown email error';

  if (code === 'EAUTH' || error.responseCode === 535) {
    return 'Gmail authentication failed. Check EMAIL_USER and confirm EMAIL_PASS is a Google App Password.';
  }

  if (code === 'ETIMEDOUT' || code === 'ESOCKET' || /timeout|timed out/i.test(message)) {
    return 'SMTP connection timed out. Render may not allow outbound SMTP connections.';
  }

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'DNS lookup failed. Check SMTP_HOST setting.';
  }

  if (code === 'ECONNECTION' || code === 'ECONNRESET') {
    return 'SMTP connection was refused or reset. Render free tier may block SMTP ports.';
  }

  if (error.responseCode && error.responseCode >= 500) {
    return 'Gmail SMTP server returned a temporary error.';
  }

  if (error.responseCode && error.responseCode >= 400) {
    return 'Gmail rejected the message. Check sender address and recipient emails.';
  }

  return `Email failed: ${message}`;
};

const createTransporter = (port = SMTP_PORT) => {
  validateSmtpConfig();
  const config = getTransportConfig(port);
  console.log(
    `[EMAIL] Creating Nodemailer transporter: host=${config.host}, port=${config.port}, secure=${config.secure}`
  );
  return nodemailer.createTransport(config);
};

const closeTransporter = (transporter) => {
  if (transporter && typeof transporter.close === 'function') {
    transporter.close();
    console.log('[EMAIL] SMTP transporter closed.');
  }
};

const verifyOnPort = async (port) => {
  let transporter;
  const config = getTransportConfig(port);

  try {
    console.log(`[EMAIL] Testing Gmail SMTP connection: ${config.host}:${config.port} secure=${config.secure}`);
    transporter = createTransporter(port);
    await transporter.verify();
    console.log('[EMAIL] Gmail SMTP connection verified successfully.');
    return true;
  } catch (error) {
    console.error(`[EMAIL] SMTP verification failed on port ${port}: ${error.message}`);
    console.error(`[EMAIL] Diagnosis: ${classifyEmailError(error)}`);
    console.error(error.stack);
    throw error;
  } finally {
    closeTransporter(transporter);
  }
};

const getAlternateGmailPort = (port) => {
  if (SMTP_HOST !== 'smtp.gmail.com') return null;
  if (port === 465) return 587;
  if (port === 587) return 465;
  return null;
};

const isRetryableEmailError = (error) => {
  const code = error && error.code;
  if (['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ECONNRESET', 'EAI_AGAIN'].includes(code)) return true;
  if (error.responseCode && error.responseCode >= 500) return true;
  return /timeout|timed out/i.test(error.message || '');
};

const verifyEmailConnection = async () => {
  console.log('[EMAIL] Starting Gmail SMTP startup verification...');

  try {
    await verifyOnPort(SMTP_PORT);
  } catch (error) {
    const alternatePort = getAlternateGmailPort(SMTP_PORT);
    if (!alternatePort || !isRetryableEmailError(error)) {
      throw error;
    }

    console.warn(`[EMAIL] Primary port ${SMTP_PORT} failed. Testing alternate port ${alternatePort}...`);
    try {
      await verifyOnPort(alternatePort);
      console.warn(`[EMAIL] Gmail SMTP works on port ${alternatePort}. Consider updating SMTP_PORT in Render.`);
    } catch (alternateError) {
      throw new Error(`Gmail SMTP failed on both ports ${SMTP_PORT} and ${alternatePort}. Render may block SMTP connections.`);
    }
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildEmailContent = (trackingCode, pdfPath) => {
  const recipients = getRecipients();
  const submittedDate = new Date().toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  console.log(`[EMAIL] Preparing message for ${recipients.length} recipient(s). Attachment=${path.basename(pdfPath)}`);

  return {
    from: EMAIL_FROM,
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
    attachment: {
      filename: path.basename(pdfPath),
      path: pdfPath,
      contentType: 'application/pdf',
    },
  };
};

const sendViaSmtp = async (trackingCode, pdfPath) => {
  const emailContent = buildEmailContent(trackingCode, pdfPath);
  let lastError;

  for (let attempt = 1; attempt <= SMTP_RETRY_ATTEMPTS; attempt += 1) {
    const port = getPortForAttempt(attempt);
    let transporter;

    try {
      const config = getTransportConfig(port);
      console.log(`[EMAIL] Sending email attempt ${attempt}/${SMTP_RETRY_ATTEMPTS} via ${config.host}:${config.port}`);
      transporter = createTransporter(port);
      console.log('[EMAIL] Sending email with PDF attachment...');
      const info = await transporter.sendMail({
        from: emailContent.from,
        to: emailContent.to,
        subject: emailContent.subject,
        html: emailContent.html,
        attachments: [emailContent.attachment],
      });
      console.log(`[EMAIL] Email sent successfully. MessageId=${info.messageId}`);
      console.log(`[EMAIL] Accepted: ${(info.accepted || []).join(', ')}`);
      console.log(`[EMAIL] Rejected: ${(info.rejected || []).join(', ')}`);
      return info;
    } catch (error) {
      lastError = error;
      console.error(`[EMAIL] Attempt ${attempt}/${SMTP_RETRY_ATTEMPTS} failed: ${error.message}`);
      console.error(`[EMAIL] Diagnosis: ${classifyEmailError(error)}`);
      console.error(error.stack);

      if (!isRetryableEmailError(error) || attempt === SMTP_RETRY_ATTEMPTS) {
        break;
      }

      const delayMs = attempt * 3000;
      console.log(`[EMAIL] Retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    } finally {
      closeTransporter(transporter);
    }
  }

  throw lastError;
};

const sendSurveyEmail = async (trackingCode, pdfPath) => {
  return sendViaSmtp(trackingCode, pdfPath);
};

module.exports = {
  sendSurveyEmail,
  verifyEmailConnection,
  classifyEmailError,
};

