const nodemailer = require('nodemailer');
const path = require('path');

const EMAIL_USER = process.env.EMAIL_USER || process.env.SMTP_EMAIL;
const EMAIL_PASS = process.env.EMAIL_PASS || process.env.SMTP_APP_PASSWORD;
const RECEIVER_EMAILS = process.env.RECEIVER_EMAILS || process.env.RECEIVER_EMAIL;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
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
  return process.env.SMTP_SECURE === 'true';
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

const validateEmailConfig = () => {
  console.log('[EMAIL] Loading Gmail SMTP environment variables...');
  console.log(`[EMAIL] EMAIL_USER: ${redactEmail(EMAIL_USER)}`);
  console.log(`[EMAIL] EMAIL_PASS: ${EMAIL_PASS ? 'configured' : 'missing'}`);
  console.log(`[EMAIL] RECEIVER_EMAILS: ${RECEIVER_EMAILS ? 'configured' : 'missing'}`);

  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('Missing Gmail credentials. Set EMAIL_USER and EMAIL_PASS in Render environment variables.');
  }

  const normalizedPass = normalizePassword(EMAIL_PASS);
  if (normalizedPass.length !== 16) {
    throw new Error(
      'EMAIL_PASS must be a 16-character Google App Password, not the normal Gmail account password. Generate it at https://myaccount.google.com/apppasswords.'
    );
  }

  if (!RECEIVER_EMAILS) {
    throw new Error('Missing recipients. Set RECEIVER_EMAILS in Render environment variables.');
  }
};

const classifyEmailError = (error) => {
  const code = error && (error.code || error.command || error.responseCode);
  const message = error && error.message ? error.message : 'Unknown email error';

  if (code === 'EAUTH' || error.responseCode === 535) {
    return 'Gmail authentication failed. Check EMAIL_USER and confirm EMAIL_PASS is a Google App Password.';
  }

  if (code === 'ETIMEDOUT' || code === 'ESOCKET' || /timeout|timed out/i.test(message)) {
    return 'SMTP connection timed out before Gmail responded. This is a network/port reachability problem between Render and smtp.gmail.com, or the selected SMTP port is blocked/unreachable.';
  }

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'DNS lookup failed for smtp.gmail.com from the backend host.';
  }

  if (error.responseCode && error.responseCode >= 500) {
    return 'Gmail accepted the connection but returned a temporary server-side SMTP error.';
  }

  if (error.responseCode && error.responseCode >= 400) {
    return 'Gmail rejected the message or one of the recipients.';
  }

  return 'Email failed for an unclassified SMTP error. See the full stack trace above.';
};

const createTransporter = (port = SMTP_PORT) => {
  validateEmailConfig();
  const config = getTransportConfig(port);
  console.log(
    `[EMAIL] Creating Nodemailer transporter: host=${config.host}, port=${config.port}, secure=${config.secure}, requireTLS=${config.requireTLS}`
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
    console.log(`[EMAIL] Connecting to Gmail SMTP for verification: ${config.host}:${config.port} secure=${config.secure}`);
    transporter = createTransporter(port);
    await transporter.verify();
    console.log('[EMAIL] Authentication successful. Gmail SMTP is reachable.');
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

const verifyEmailConnection = async () => {
  console.log('[EMAIL] Starting Gmail SMTP startup verification...');

  try {
    await verifyOnPort(SMTP_PORT);
  } catch (error) {
    const alternatePort = getAlternateGmailPort(SMTP_PORT);
    if (!alternatePort || !isRetryableEmailError(error)) {
      throw error;
    }

    console.warn(`[EMAIL] Primary Gmail SMTP port ${SMTP_PORT} was not reachable. Testing alternate Gmail port ${alternatePort}...`);
    await verifyOnPort(alternatePort);
    console.warn(`[EMAIL] Gmail is reachable on port ${alternatePort}. Set SMTP_PORT=${alternatePort} on Render if port ${SMTP_PORT} keeps timing out.`);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRecipients = () => {
  validateEmailConfig();
  const recipients = RECEIVER_EMAILS.split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    throw new Error('RECEIVER_EMAILS did not contain any valid email addresses.');
  }

  return recipients;
};

const buildMailOptions = (trackingCode, pdfPath) => {
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
        contentType: 'application/pdf',
      },
    ],
  };
};

const isRetryableEmailError = (error) => {
  const code = error && error.code;
  if (['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ECONNRESET', 'EAI_AGAIN'].includes(code)) return true;
  if (error.responseCode && error.responseCode >= 500) return true;
  return /timeout|timed out/i.test(error.message || '');
};

const getPortForAttempt = (attempt) => {
  if (attempt < SMTP_RETRY_ATTEMPTS) return SMTP_PORT;
  if (SMTP_HOST === 'smtp.gmail.com' && SMTP_PORT === 465) return 587;
  if (SMTP_HOST === 'smtp.gmail.com' && SMTP_PORT === 587) return 465;
  return SMTP_PORT;
};

const sendSurveyEmail = async (trackingCode, pdfPath) => {
  const mailOptions = buildMailOptions(trackingCode, pdfPath);
  let lastError;

  for (let attempt = 1; attempt <= SMTP_RETRY_ATTEMPTS; attempt += 1) {
    const port = getPortForAttempt(attempt);
    let transporter;

    try {
      const config = getTransportConfig(port);
      console.log(`[EMAIL] Sending email attempt ${attempt}/${SMTP_RETRY_ATTEMPTS} via ${config.host}:${config.port} secure=${config.secure}`);
      console.log('[EMAIL] Connecting to Gmail SMTP...');
      transporter = createTransporter(port);
      console.log('[EMAIL] Sending email with PDF attachment...');
      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Email sent. Gmail accepted messageId=${info.messageId}`);
      console.log(`[EMAIL] Accepted recipients: ${(info.accepted || []).join(', ') || 'none reported'}`);
      console.log(`[EMAIL] Rejected recipients: ${(info.rejected || []).join(', ') || 'none'}`);
      return info;
    } catch (error) {
      lastError = error;
      console.error(`[EMAIL] Email sending failed on attempt ${attempt}/${SMTP_RETRY_ATTEMPTS}: ${error.message}`);
      console.error(`[EMAIL] Diagnosis: ${classifyEmailError(error)}`);
      console.error(error.stack);

      if (!isRetryableEmailError(error) || attempt === SMTP_RETRY_ATTEMPTS) {
        break;
      }

      const delayMs = attempt * 3000;
      console.log(`[EMAIL] Retrying SMTP send in ${delayMs}ms...`);
      await sleep(delayMs);
    } finally {
      closeTransporter(transporter);
    }
  }

  throw lastError;
};

module.exports = {
  sendSurveyEmail,
  verifyEmailConnection,
  validateEmailConfig,
  classifyEmailError,
  getTransportConfig,
};

