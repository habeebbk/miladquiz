const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  order: { type: Number, required: true },           // 1..20, controls test sequence
  text: { type: String, required: true },
  options: {
    A: { type: String, required: true },
    B: { type: String, required: true },
    C: { type: String, required: true },
    D: { type: String, required: true }
  },
  correctOption: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Question', QuestionSchema);
