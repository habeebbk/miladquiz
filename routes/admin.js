const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Result = require('../models/Result');
const adminAuth = require('../middleware/adminAuth');

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin', username }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    });
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Invalid admin username or password.' });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

// GET /api/admin/me - check current session
router.get('/me', adminAuth, (req, res) => {
  res.json({ username: req.admin.username });
});

// GET /api/admin/results - summary list, admin only
router.get('/results', adminAuth, async (req, res) => {
  try {
    const results = await Result.find({})
      .sort({ submittedAt: -1 })
      .select('participantSnapshot score totalQuestions correctCount wrongCount unansweredCount submittedAt startedAt');

    res.json({ results });
  } catch (err) {
    console.error('Admin list results error:', err);
    res.status(500).json({ error: 'Could not load results.' });
  }
});

// GET /api/admin/results/:id - full detail with per-question answers, admin only
router.get('/results/:id', adminAuth, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ error: 'Result not found.' });
    res.json({ result });
  } catch (err) {
    console.error('Admin get result error:', err);
    res.status(500).json({ error: 'Could not load this result.' });
  }
});

module.exports = router;
