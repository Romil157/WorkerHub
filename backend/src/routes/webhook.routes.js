const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Booking = require('../models/Booking');
const logger = require('../utils/logger');

// Raw body needed for Razorpay signature verification
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex');

  if (signature !== expectedSignature) {
    logger.warn('Invalid Razorpay webhook signature');
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  const event = JSON.parse(req.body);
  const { event: eventType, payload } = event;

  try {
    switch (eventType) {
      case 'payment.authorized': {
        const paymentId = payload.payment.entity.id;
        const orderId = payload.payment.entity.order_id;
        await Booking.findOneAndUpdate(
          { razorpayOrderId: orderId },
          { paymentStatus: 'completed', razorpayPaymentId: paymentId, paidAt: new Date() }
        );
        break;
      }
      case 'payment.failed': {
        const orderId = payload.payment.entity.order_id;
        await Booking.findOneAndUpdate(
          { razorpayOrderId: orderId },
          { paymentStatus: 'failed' }
        );
        break;
      }
      case 'refund.created': {
        const refundId = payload.refund.entity.id;
        const paymentId = payload.refund.entity.payment_id;
        await Booking.findOneAndUpdate(
          { razorpayPaymentId: paymentId },
          { refundId, refundStatus: 'pending' }
        );
        break;
      }
      case 'refund.processed': {
        const paymentId = payload.refund.entity.payment_id;
        await Booking.findOneAndUpdate(
          { razorpayPaymentId: paymentId },
          { refundStatus: 'completed', refundedAt: new Date(), paymentStatus: 'refunded' }
        );
        break;
      }
      default:
        logger.info(`Unhandled Razorpay event: ${eventType}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error:', error);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
