const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { 
    type: String, 
    required: true, 
    trim: true, 
    index: true,
    match: [/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'] 
  },
  place: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },

  // becomes true once this participant has submitted a result,
  // used to block re-taking the test with the same phone number
  hasSubmitted: { type: Boolean, default: false }
});

module.exports = mongoose.model('Participant', ParticipantSchema);
