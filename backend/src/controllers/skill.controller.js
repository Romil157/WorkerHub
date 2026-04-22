const Skill = require('../models/Skill');

const getAllSkills = async (req, res) => {
  const skills = await Skill.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, data: skills });
};

module.exports = { getAllSkills };
