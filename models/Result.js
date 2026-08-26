const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  order: { type: Number, required: true },
  questionText: { type: String, required: true },
  selectedOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null }, // null = not answered in time
  correctOption: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
  isCorrect: { type: Boolean, required: true },
  timeTakenSeconds: { type: Number, default: 20 }
}, { _id: false });

const ResultSchema = new mongoose.Schema({
  participant: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },

  // snapshot of participant details at time of test, so admin view doesn't
  // depend on a join and survives even if the participant doc changes
  participantSnapshot: {
    name: String,
    phone: String,
    place: String
  },

  answers: [AnswerSchema],
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  wrongCount: { type: Number, required: true },
  unansweredCount: { type: Number, required: true },

  startedAt: { type: Date, required: true },
  submittedAt: { type: Date, default: Date.now },

  // Results are never exposed to the participant. This flag exists only so
  // an admin could, in the future, explicitly mark a batch as "published"
  // without changing how the participant-facing routes behave.
  publishedToParticipant: { type: Boolean, default: false }
});

module.exports = mongoose.model('Result', ResultSchema);
