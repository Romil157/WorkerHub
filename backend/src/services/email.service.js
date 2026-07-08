const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'SG.placeholder');

const FROM = {
  email: process.env.SENDGRID_FROM_EMAIL || 'noreply@workerhub.in',
  name: process.env.SENDGRID_FROM_NAME || 'WorkerHub',
};

const isDevMode = !process.env.SENDGRID_API_KEY ||
  process.env.SENDGRID_API_KEY.startsWith('SG.placeholder') ||
  process.env.SENDGRID_API_KEY.startsWith('SG.your') ||
  process.env.SENDGRID_API_KEY.length < 30;

const sendEmail = async (to, subject, html) => {
  if (isDevMode) {
    logger.info(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await sgMail.send({ to, from: FROM, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`);
    // Don't throw — email failure shouldn't break registration
  }
};

const templates = {
  emailVerification: (name, token) => `
    <div style="font-family:Poppins,sans-serif;max-width:600px;margin:0 auto;background:#FAF5F0;padding:40px;border-radius:16px">
      <h1 style="color:#D4501D">Welcome to WorkerHub, ${name}! 🙏</h1>
      <p style="color:#2C2C2C">Please verify your email to complete registration.</p>
      <a href="${process.env.FRONTEND_URL}/verify-email/${token}" style="background:#D4501D;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;margin:20px 0">Verify Email</a>
      <p style="color:#666;font-size:12px">Link expires in 24 hours.</p>
    </div>
  `,
  verificationApproved: (name) => `
    <div style="font-family:Poppins,sans-serif;max-width:600px;margin:0 auto;background:#FAF5F0;padding:40px;border-radius:16px">
      <h1 style="color:#1A5D3D">🎉 You're Verified, ${name}!</h1>
      <p style="color:#2C2C2C">Your WorkerHub profile has been reviewed and approved. You can now start accepting jobs from customers near you!</p>
      <a href="${process.env.FRONTEND_URL}/worker/dashboard" style="background:#1A5D3D;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;margin:20px 0">Go to Dashboard</a>
    </div>
  `,
  verificationRejected: (name, reason) => `
    <div style="font-family:Poppins,sans-serif;max-width:600px;margin:0 auto;background:#FAF5F0;padding:40px;border-radius:16px">
      <h1 style="color:#E74C3C">Verification Update for ${name}</h1>
      <p style="color:#2C2C2C">Unfortunately, your profile verification was not approved at this time.</p>
      <div style="background:#FEF2F2;border:1px solid #E74C3C;padding:16px;border-radius:8px;margin:20px 0">
        <strong>Reason:</strong> ${reason}
      </div>
      <p>Please correct the issues and re-apply. Contact support if you need help.</p>
      <a href="${process.env.FRONTEND_URL}/worker/profile" style="background:#D4501D;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block">Update Profile</a>
    </div>
  `,
  aiImageFlagged: (name, docType) => `
    <div style="font-family:Poppins,sans-serif;max-width:600px;margin:0 auto;background:#FAF5F0;padding:40px;border-radius:16px">
      <h1 style="color:#E67E22">⚠️ Image Review Required, ${name}</h1>
      <p>Our system detected that your <strong>${docType}</strong> may be AI-generated or not authentic.</p>
      <p>Please upload real, genuine photographs. Workers with AI-generated images cannot be verified.</p>
      <a href="${process.env.FRONTEND_URL}/worker/profile" style="background:#E67E22;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block">Update Documents</a>
    </div>
  `,
  bookingConfirmation: (customerName, workerName, booking) => `
    <div style="font-family:Poppins,sans-serif;max-width:600px;margin:0 auto;background:#FAF5F0;padding:40px;border-radius:16px">
      <h1 style="color:#D4501D">Booking Confirmed! 🏠</h1>
      <p>Hi ${customerName}, your booking is confirmed.</p>
      <div style="background:#fff;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #D4501D">
        <p><strong>Worker:</strong> ${workerName}</p>
        <p><strong>Service:</strong> ${booking.skillRequired}</p>
        <p><strong>Date:</strong> ${new Date(booking.scheduledDate).toDateString()}</p>
        <p><strong>Time:</strong> ${booking.scheduledTime}</p>
        <p><strong>Amount Paid:</strong> ₹${booking.totalAmount}</p>
        <p><strong>Order ID:</strong> #WH-${booking._id.toString().slice(-6).toUpperCase()}</p>
      </div>
      <a href="${process.env.FRONTEND_URL}/customer/orders" style="background:#1A5D3D;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block">View Order</a>
    </div>
  `,
  reviewRequest: (booking) => `
    <div style="font-family:Poppins,sans-serif;max-width:600px;margin:0 auto;background:#FAF5F0;padding:40px;border-radius:16px">
      <h1 style="color:#D4501D">How was the service? ⭐</h1>
      <p>Your ${booking.skillRequired} job is complete! Take a moment to rate your experience.</p>
      <a href="${process.env.FRONTEND_URL}/customer/orders/${booking._id}/review" style="background:#F39C12;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block">Leave a Review</a>
    </div>
  `,
  complaintResolved: (name, resolution) => `
    <div style="font-family:Poppins,sans-serif;max-width:600px;margin:0 auto;background:#FAF5F0;padding:40px;border-radius:16px">
      <h1 style="color:#1A5D3D">Complaint Resolved ✅</h1>
      <p>Hi ${name}, your complaint has been resolved.</p>
      <p><strong>Resolution:</strong> ${resolution.replace('_', ' ').toUpperCase()}</p>
      <p>Thank you for your patience.</p>
    </div>
  `,
};

module.exports = {
  sendEmailVerification: (email, name, token) =>
    sendEmail(email, 'Verify your WorkerHub email', templates.emailVerification(name, token)),
  sendVerificationApproved: (email, name) =>
    sendEmail(email, 'Your WorkerHub profile is verified!', templates.verificationApproved(name)),
  sendVerificationRejected: (email, name, reason) =>
    sendEmail(email, 'WorkerHub Verification Update', templates.verificationRejected(name, reason)),
  sendAIImageFlaggedEmail: (email, name, docType) =>
    sendEmail(email, 'Image Review Required - WorkerHub', templates.aiImageFlagged(name, docType)),
  sendBookingConfirmation: (customer, worker, booking) =>
    sendEmail(customer.email, 'Booking Confirmed - WorkerHub', templates.bookingConfirmation(customer.name, worker.name, booking)),
  sendReviewRequest: async (customerId, bookingId) => {
    const User = require('../models/User');
    const Booking = require('../models/Booking');
    const user = await User.findById(customerId);
    const booking = await Booking.findById(bookingId);
    if (user && booking) sendEmail(user.email, 'How was your experience? - WorkerHub', templates.reviewRequest(booking));
  },
  sendComplaintResolved: (email, name, resolution) =>
    sendEmail(email, 'Complaint Resolved - WorkerHub', templates.complaintResolved(name, resolution)),
};
