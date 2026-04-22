const logger = require('../utils/logger');

/**
 * OTP SMS Service using Twilio.
 * Falls back to console.log in dev mode.
 */
const sendSMS = async (phone, message) => {
  if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'ACyour_account_sid') {
    logger.info(`[DEV SMS] To: ${phone} | Message: ${message}`);
    return { success: true, mock: true };
  }

  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  const result = await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });

  logger.info(`SMS sent to ${phone}: ${result.sid}`);
  return { success: true, sid: result.sid };
};

module.exports = { sendSMS };
