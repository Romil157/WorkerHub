const jsQR = require('jsqr');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');
const zlib = require('zlib');
const Tesseract = require('tesseract.js');
const logger = require('../utils/logger');
const { validateVerhoeff } = require('../utils/aadhaarChecksum');

// Helper to decode raw image pixels from a buffer (supports PNG and JPG/JPEG)
function decodeImage(buffer) {
  try {
    const raw = jpeg.decode(buffer);
    return { data: new Uint8ClampedArray(raw.data), width: raw.width, height: raw.height };
  } catch (jpegError) {
    try {
      const png = PNG.sync.read(buffer);
      return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
    } catch (pngError) {
      logger.error('Failed to decode image as JPEG or PNG: ' + pngError.message);
      return null;
    }
  }
}

// Parses demographic data from older XML QR format
function parseXmlAadhaar(text) {
  const uid = text.match(/uid="(\d+)"/)?.[1];
  const name = text.match(/name="([^"]+)"/)?.[1];
  const yob = text.match(/yob="(\d+)"/)?.[1];
  const dob = text.match(/dob="([^"]+)"/)?.[1];
  const gender = text.match(/gender="([^"]+)"/)?.[1];

  if (!uid && !name) return null;
  return { uid, name, dob, yob, gender };
}

// Parses demographic data from modern Secure QR binary format
function parseSecureAadhaar(text) {
  try {
    if (!/^\d+$/.test(text)) return null;

    const bigInt = BigInt(text);
    let hex = bigInt.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    const buffer = Buffer.from(hex, 'hex');

    // Decompress using zlib (secure QR is compressed with zlib deflate)
    const decompressed = zlib.unzipSync(buffer);

    // UIDAI Secure QR byte-delimited format uses 255 (0xFF) as separator.
    const fields = [];
    let lastIndex = 0;
    for (let i = 0; i < decompressed.length; i++) {
      if (decompressed[i] === 255) {
        fields.push(decompressed.subarray(lastIndex, i));
        lastIndex = i + 1;
      }
    }
    if (lastIndex < decompressed.length) {
      fields.push(decompressed.subarray(lastIndex));
    }

    const name = fields[1]?.toString('utf8');
    const dob = fields[2]?.toString('utf8');
    const gender = fields[3]?.toString('utf8');

    return { name, dob, gender };
  } catch (err) {
    logger.error('Failed to parse secure Aadhaar QR: ' + err.message);
    return null;
  }
}

// Simple name matcher with normalizations
function nameMatches(userFullName, docName) {
  if (!userFullName || !docName) return false;
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const c1 = clean(userFullName);
  const c2 = clean(docName);
  return c1.includes(c2) || c2.includes(c1);
}

// Match date of birth year
function dobMatches(userDob, docDob, docYob) {
  if (!userDob) return true;
  const userDate = new Date(userDob);
  const userYear = userDate.getFullYear();

  if (docYob && parseInt(docYob) === userYear) {
    return true;
  }

  if (docDob) {
    const parts = docDob.split(/[-/]/);
    if (parts.length === 3) {
      const docYear = parseInt(parts[2]);
      if (docYear === userYear) return true;
    }
  }

  return false;
}

// OCR fallback function
async function runOcr(imageBuffer) {
  try {
    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng');
    return text;
  } catch (err) {
    logger.error('Tesseract OCR failed: ' + err.message);
    return null;
  }
}

/**
 * AI-generated / tamper check for general images (like portfolio photos).
 * Uses Sightengine GenAI model if credentials exist.
 */
const checkImage = async (imageUrl) => {
  const apiUser = process.env.AI_DETECTION_API_USER;
  const apiSecret = process.env.AI_DETECTION_API_SECRET;

  if (!apiUser || !apiSecret || apiUser === 'placeholder' || apiSecret === 'placeholder') {
    logger.info(`[DEV SIGHTENGINE] Skipping AI detection for: ${imageUrl}`);
    return { isAI: false, confidence: 0, provider: 'dev_mock' };
  }

  try {
    const url = `https://api.sightengine.com/1.0/check.json?url=${encodeURIComponent(imageUrl)}&models=genai&api_user=${apiUser}&api_secret=${apiSecret}`;
    
    // Custom timeout fetch helper
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(id);

    if (!response.ok) throw new Error(`Sightengine HTTP error: ${response.status}`);

    const data = await response.json();
    if (data.status !== 'success') {
      throw new Error(`Sightengine response status: ${data.status}`);
    }

    const confidence = data.type?.ai_generated || 0;
    const threshold = parseFloat(process.env.AI_DETECTION_SCORE_THRESHOLD || '0.7');
    const isAI = confidence >= threshold;

    logger.info(`Sightengine AI detection: ${imageUrl} — confidence: ${confidence}, flagged: ${isAI}`);
    return { isAI, confidence, provider: 'sightengine' };
  } catch (error) {
    logger.error(`Sightengine AI detection failed for ${imageUrl}: ${error.message}`);
    // Fail-safe: trigger review if external API check fails
    return { isAI: true, confidence: 0.5, provider: 'error_fallback', error: error.message };
  }
};

/**
 * Perform KYC Aadhaar fraud detection check.
 */
const verifyAadhar = async ({ frontBuffer, frontUrl, backUrl, aadharNumber, fullName, dateOfBirth }) => {
  const reasons = [];
  const checks = {
    checksumValid: false,
    qrCrossCheck: 'unreadable',
    ocrCrossCheck: 'skipped',
    aiGeneratedScore: 0,
    aiDetectionProvider: 'dev_mock'
  };

  // 1. Aadhaar number checksum check
  const checksumValid = validateVerhoeff(aadharNumber);
  checks.checksumValid = checksumValid;
  if (!checksumValid) {
    const maskedAadhar = aadharNumber ? `XXXX-XXXX-${aadharNumber.slice(-4)}` : 'N/A';
    reasons.push(`Invalid Aadhaar checksum for number ${maskedAadhar}`);
    return {
      verdict: 'reject',
      overallConfidence: 1.0,
      checks,
      reasons
    };
  }

  // 2. Decode QR Code from front photo
  let qrData = null;
  const decodedFront = decodeImage(frontBuffer);
  if (decodedFront) {
    const qrResult = jsQR(decodedFront.data, decodedFront.width, decodedFront.height);
    if (qrResult) {
      qrData = parseXmlAadhaar(qrResult.data) || parseSecureAadhaar(qrResult.data);
    }
  }

  if (qrData) {
    const nameMatch = nameMatches(fullName, qrData.name);
    const dobMatch = dobMatches(dateOfBirth, qrData.dob, qrData.yob);

    if (nameMatch && dobMatch) {
      checks.qrCrossCheck = 'match';
    } else {
      checks.qrCrossCheck = 'mismatch';
      if (!nameMatch) reasons.push(`Name mismatch: Profile name '${fullName}' does not match Aadhaar QR name '${qrData.name || 'N/A'}'`);
      if (!dobMatch) reasons.push(`DOB mismatch: Profile DOB does not match Aadhaar QR DOB`);
    }
  } else {
    checks.qrCrossCheck = 'unreadable';
    reasons.push('Aadhaar QR code is unreadable or missing');
  }

  // 3. OCR Fallback if QR code is unreadable
  if (checks.qrCrossCheck === 'unreadable') {
    checks.ocrCrossCheck = 'unreadable';
    const ocrText = await runOcr(frontBuffer);
    if (ocrText) {
      const cleanText = ocrText.replace(/\s/g, '');
      const cleanAadhar = aadharNumber.replace(/\s/g, '');
      const last4 = cleanAadhar.slice(-4);
      
      const containsLast4 = cleanText.includes(last4);
      const nameMatch = nameMatches(fullName, ocrText);

      if (containsLast4 && nameMatch) {
        checks.ocrCrossCheck = 'match';
      } else {
        checks.ocrCrossCheck = 'mismatch';
        if (!containsLast4) reasons.push(`OCR failed: Could not find last 4 digits (${last4}) of Aadhaar number in front image text`);
        if (!nameMatch) reasons.push(`OCR failed: Name '${fullName}' not found in front image text`);
      }
    } else {
      reasons.push('Aadhaar OCR text extraction failed');
    }
  }

  // 4. Sightengine AI generated check for front and back images
  const [frontAI, backAI] = await Promise.all([
    checkImage(frontUrl),
    checkImage(backUrl)
  ]);

  checks.aiGeneratedScore = Math.max(frontAI.confidence, backAI.confidence);
  
  if (frontAI.provider === 'sightengine' || backAI.provider === 'sightengine') {
    checks.aiDetectionProvider = 'sightengine';
  } else if (frontAI.provider === 'error_fallback' || backAI.provider === 'error_fallback') {
    checks.aiDetectionProvider = 'error_fallback';
  } else {
    checks.aiDetectionProvider = 'dev_mock';
  }

  if (frontAI.provider === 'error_fallback' || backAI.provider === 'error_fallback') {
    reasons.push('Sightengine AI detection API offline or timed out (failed closed)');
  } else {
    const threshold = parseFloat(process.env.AI_DETECTION_SCORE_THRESHOLD || '0.7');
    if (checks.aiGeneratedScore >= threshold) {
      reasons.push(`Aadhaar image flagged as AI-generated/modified (confidence: ${checks.aiGeneratedScore.toFixed(2)})`);
    }
  }

  // 5. Calculate overall verdict
  let verdict = 'pass';
  if (
    checks.qrCrossCheck === 'mismatch' || 
    checks.ocrCrossCheck === 'mismatch' || 
    checks.aiGeneratedScore >= parseFloat(process.env.AI_DETECTION_SCORE_THRESHOLD || '0.7') || 
    checks.aiDetectionProvider === 'error_fallback'
  ) {
    verdict = 'flag_for_review';
  }

  let overallConfidence = 1.0;
  if (checks.qrCrossCheck === 'unreadable' && checks.ocrCrossCheck === 'match') {
    overallConfidence = 0.8;
  } else if (checks.qrCrossCheck === 'unreadable' && checks.ocrCrossCheck === 'unreadable') {
    overallConfidence = 0.5;
  }

  return {
    verdict,
    overallConfidence,
    checks,
    reasons
  };
};

module.exports = { checkImage, verifyAadhar };
