const express = require('express');
const router = express.Router();
const Participant = require('../models/Participant');
const Question = require('../models/Question');
const Result = require('../models/Result');

const TOTAL_QUESTIONS = parseInt(process.env.TOTAL_QUESTIONS || '20', 10);
const SECONDS_PER_QUESTION = parseInt(process.env.SECONDS_PER_QUESTION || '30', 10);

// Require a registered participant for every route in this file
async function requireParticipant(req, res, next) {
  const participantId = req.cookies && req.cookies.participant_id;
  if (!participantId) {
    return res.status(401).json({ error: 'Please register your details before starting the test.' });
  }
  const participant = await Participant.findById(participantId);
  if (!participant) {
    return res.status(401).json({ error: 'Registration not found. Please register again.' });
  }
  if (participant.hasSubmitted) {
    return res.status(409).json({ error: 'You have already submitted this quiz. Only one attempt is allowed.' });
  }
  req.participant = participant;
  next();
}

// GET /api/quiz/config
// Basic config the frontend needs to run the timer/progress UI
router.get('/config', requireParticipant, (req, res) => {
  res.json({ totalQuestions: TOTAL_QUESTIONS, secondsPerQuestion: SECONDS_PER_QUESTION });
});

// GET /api/quiz/questions
// Returns the question set WITHOUT correct answers - never leak answers to the client.
router.get('/questions', requireParticipant, async (req, res) => {
  try {
    const questions = await Question.find({ isActive: true })
      .sort({ order: 1 })
      .limit(TOTAL_QUESTIONS);

    const safeQuestions = questions.map(q => ({
      id: q._id,
      order: q.order,
      text: q.text,
      options: q.options
    }));

    res.json({ questions: safeQuestions, secondsPerQuestion: SECONDS_PER_QUESTION });
  } catch (err) {
    console.error('Fetch questions error:', err);
    res.status(500).json({ error: 'Could not load questions.' });
  }
});

// POST /api/quiz/submit
// Body: { answers: [{ questionId, selectedOption, timeTakenSeconds }], startedAt }
// Scores the attempt server-side and stores it. The response to the participant
// NEVER includes the score or correctness - only a plain confirmation.
router.post('/submit', requireParticipant, async (req, res) => {
  try {
    const { answers, startedAt } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid submission.' });
    }

    const questionIds = answers.map(a => a.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const scoredAnswers = answers.map(a => {
      const q = questionMap.get(a.questionId);
      if (!q) return null;
      const selected = a.selectedOption || null;
      const isCorrect = selected === q.correctOption;

      if (!selected) unansweredCount++;
      else if (isCorrect) correctCount++;
      else wrongCount++;

      return {
        questionId: q._id,
        order: q.order,
        questionText: q.text,
        selectedOption: selected,
        correctOption: q.correctOption,
        isCorrect,
        timeTakenSeconds: typeof a.timeTakenSeconds === 'number' ? a.timeTakenSeconds : SECONDS_PER_QUESTION
      };
    }).filter(Boolean);

    const participant = req.participant;

    await Result.create({
      participant: participant._id,
      participantSnapshot: {
        name: participant.name,
        phone: participant.phone,
        place: participant.place
      },
      answers: scoredAnswers,
      score: correctCount,
      totalQuestions: scoredAnswers.length,
      correctCount,
      wrongCount,
      unansweredCount,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      submittedAt: new Date()
    });

    participant.hasSubmitted = true;
    await participant.save();

    // Clear the participant session cookie so the test can't be reopened.
    res.clearCookie('participant_id');

    // Deliberately no score/result data sent back.
    res.json({ success: true, message: 'Your response has been recorded.' });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Could not submit your response. Please contact the organizer.' });
  }
});

module.exports = router;
