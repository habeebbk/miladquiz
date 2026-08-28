const express = require('express');
const router = express.Router();
const Participant = require('../models/Participant');
const Question = require('../models/Question');
const Result = require('../models/Result');

const TOTAL_QUESTIONS = parseInt(process.env.TOTAL_QUESTIONS || '20', 10);
const SECONDS_PER_QUESTION = parseInt(process.env.SECONDS_PER_QUESTION || '20', 10);

// In-memory question cache — questions never change during competition
// Avoids hitting MongoDB on every GET /questions (150 users = 150 DB queries saved)
let cachedQuestions = null;
async function getQuestions() {
  if (cachedQuestions) return cachedQuestions;
  const questions = await Question.find({ isActive: true })
    .sort({ order: 1 })
    .limit(TOTAL_QUESTIONS)
    .lean(); // .lean() returns plain JS objects, ~5x faster than Mongoose documents
  cachedQuestions = questions.map(q => ({
    id: q._id,
    order: q.order,
    text: q.text,
    options: q.options
  }));
  return cachedQuestions;
}

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

// Fisher-Yates shuffle — returns a new shuffled array, original untouched
function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// GET /api/quiz/questions
// Returns cached questions shuffled uniquely per user
router.get('/questions', requireParticipant, async (req, res) => {
  try {
    const safeQuestions = await getQuestions();
    // Each user gets a randomly shuffled order — cache stays intact for scoring
    const shuffled = shuffleArray(safeQuestions);
    res.json({ questions: shuffled, secondsPerQuestion: SECONDS_PER_QUESTION });
  } catch (err) {
    console.error('Fetch questions error:', err);
    res.status(500).json({ error: 'Could not load questions.' });
  }
});

// POST /api/quiz/submit
// Scores the attempt server-side and stores immediately in MongoDB.
router.post('/submit', requireParticipant, async (req, res) => {
  try {
    const { answers, startedAt } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid submission.' });
    }

    // Use cached questions for scoring — no DB query needed
    const allQuestions = await getQuestions();
    const questionIds = answers.map(a => String(a.questionId));

    // Fetch correct answers for submitted question IDs only
    const dbQuestions = await Question.find(
      { _id: { $in: questionIds } },
      { _id: 1, correctOption: 1, order: 1, text: 1 }  // only fetch needed fields
    ).lean();
    const questionMap = new Map(dbQuestions.map(q => [q._id.toString(), q]));
    const cachedMap = new Map(allQuestions.map(q => [String(q.id), q]));

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const scoredAnswers = answers.map(a => {
      const q = questionMap.get(String(a.questionId));
      const cached = cachedMap.get(String(a.questionId));
      if (!q) return null;
      const selected = a.selectedOption || null;
      const isCorrect = selected === q.correctOption;

      if (!selected) unansweredCount++;
      else if (isCorrect) correctCount++;
      else wrongCount++;

      return {
        questionId: q._id,
        order: q.order,
        questionText: cached ? cached.text : q.text,
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
