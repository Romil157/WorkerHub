const express = require('express');
const router = express.Router();
const { getAllSkills } = require('../controllers/skill.controller');

router.get('/', getAllSkills);

module.exports = router;
