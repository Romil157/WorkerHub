const logger = require('../utils/logger');

/**
 * AI-generated image detection service.
 * In production, replace with real Deepfake API or Google Cloud Vision.
 * In dev mode, returns mock results (never flagged).
 */
const checkImage = async (imageUrl) => {
  if (!process.env.AI_DETECTION_API_KEY || process.env.AI_DETECTION_API_KEY === 'your_ai_detection_key') {
    logger.info(`[DEV AI] Skipping AI detection for: ${imageUrl}`);
    return { isAI: false, confidence: 0, provider: 'dev_mock' };
  }

  try {
    const response = await fetch(process.env.AI_DETECTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AI_DETECTION_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image_url: imageUrl }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);

    const data = await response.json();
    const confidence = data.ai_probability || data.confidence || 0;
    const isAI = confidence > 0.8; // Flag if >80% confident it's AI

    logger.info(`AI detection: ${imageUrl} — confidence: ${confidence}, flagged: ${isAI}`);
    return { isAI, confidence, provider: 'deepfake_api' };
  } catch (error) {
    logger.warn(`AI detection failed for ${imageUrl}: ${error.message}. Defaulting to not-flagged.`);
    return { isAI: false, confidence: 0, provider: 'error_fallback' };
  }
};

module.exports = { checkImage };
