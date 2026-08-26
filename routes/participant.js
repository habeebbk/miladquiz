const express = require('express');
const router = express.Router();
const Participant = require('../models/Participant');

// POST /api/participant/register
// Collects the person's details BEFORE the test starts.
// Only name, phone (10 digits), and place are collected.
// Sets an httpOnly cookie identifying the participant for the rest of the flow,
// so the test cannot be started or re-submitted without registering first.
router.post('/register', async (req, res) => {
  try {
    let { name, phone, place } = req.body;

    name = (name || '').trim();
    phone = (phone || '').trim().replace(/\D/g, ''); // remove any accidental dashes/spaces
    place = (place || '').trim();

    if (!name) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    if (!place) {
      return res.status(400).json({ error: 'Please enter your place / location.' });
    }

    // If this phone number already completed the test, don't allow a second attempt.
    const existing = await Participant.findOne({ phone });
    if (existing && existing.hasSubmitted) {
      return res.status(409).json({ error: 'This phone number has already completed the quiz. Only one attempt is allowed.' });
    }

    let participant = existing;
    if (!participant) {
      participant = await Participant.create({
        name,
        phone,
        place
      });
    } else {
      // Update details if they re-register before submitting
      participant.name = name;
      participant.place = place;
      await participant.save();
    }

    res.cookie('participant_id', participant._id.toString(), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 2 // 2 hours, enough to finish the test
    });

    res.json({ success: true, participantId: participant._id });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Could not register. Please try again.' });
  }
});

module.exports = router;
