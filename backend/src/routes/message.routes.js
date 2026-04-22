const express = require('express');
const router = express.Router();
const { getConversations, getMessages, sendMessage, markRead } = require('../controllers/message.controller');
const { protect } = require('../middleware/auth');
const { upload } = require('../services/cloudinary.service');

router.use(protect);
router.get('/conversations', getConversations);
router.get('/:userId', getMessages);
router.post('/', upload.array('attachments', 3), sendMessage);
router.put('/:conversationId/read', markRead);

module.exports = router;
