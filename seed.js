// Run with: npm run seed
// Replace the sampleQuestions array with your own 20 questions before going live.
require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('./models/Question');

const sampleQuestions = [
  { order: 1, text: 'ഇന്ത്യയുടെ തലസ്ഥാനം ഏതാണ്?', options: { A: 'മുംബൈ', B: 'ന്യൂഡൽഹി', C: 'കൊൽക്കത്ത', D: 'ചെന്നൈ' }, correctOption: 'B' },
  { order: 2, text: 'കേരളത്തിന്റെ തലസ്ഥാനം ഏതാണ്?', options: { A: 'കൊച്ചി', B: 'കോഴിക്കോട്', C: 'തിരുവനന്തപുരം', D: 'കണ്ണൂർ' }, correctOption: 'C' },
  { order: 3, text: 'കേരളത്തിന്റെ സംസ്ഥാന മൃഗം ഏതാണ്?', options: { A: 'ആന', B: 'കടുവ', C: 'സിംഹം', D: 'മാൻ' }, correctOption: 'A' },
  { order: 4, text: 'കേരളത്തിന്റെ സംസ്ഥാന പക്ഷി ഏതാണ്?', options: { A: 'മയിൽ', B: 'മലമുഴക്കി വേഴാമ്പൽ', C: 'കാക്ക', D: 'തത്ത' }, correctOption: 'B' },
  { order: 5, text: 'ഇന്ത്യയുടെ ദേശീയ മൃഗം ഏതാണ്?', options: { A: 'ആന', B: 'സിംഹം', C: 'കടുവ', D: 'മാൻ' }, correctOption: 'C' },
  { order: 6, text: 'ഇന്ത്യയുടെ ദേശീയ പക്ഷി ഏതാണ്?', options: { A: 'മയിൽ', B: 'തത്ത', C: 'കാക്ക', D: 'പ്രാവ്' }, correctOption: 'A' },
  { order: 7, text: 'കേരളത്തിൽ എത്ര ജില്ലകളുണ്ട്?', options: { A: '12', B: '13', C: '14', D: '15' }, correctOption: 'C' },
  { order: 8, text: 'കേരളത്തിലെ ഏറ്റവും നീളം കൂടിയ നദി ഏതാണ്?', options: { A: 'പെരിയാർ', B: 'ഭാരതപ്പുഴ', C: 'പമ്പ', D: 'ചാലിയാർ' }, correctOption: 'A' },
  { order: 9, text: 'ഇന്ത്യയുടെ ദേശീയ പുഷ്പം ഏതാണ്?', options: { A: 'റോസ്', B: 'താമര', C: 'ചെമ്പരത്തി', D: 'മുല്ല' }, correctOption: 'B' },
  { order: 10, text: 'ഇന്ത്യയുടെ ദേശീയ ഫലം ഏതാണ്?', options: { A: 'ആപ്പിൾ', B: 'വാഴപ്പഴം', C: 'മാങ്ങ', D: 'ഓറഞ്ച്' }, correctOption: 'C' },
  { order: 11, text: 'ഭൂമിയുടെ ഉപഗ്രഹം ഏതാണ്?', options: { A: 'സൂര്യൻ', B: 'ചന്ദ്രൻ', C: 'ചൊവ്വ', D: 'ശുക്രൻ' }, correctOption: 'B' },
  { order: 12, text: 'സൂര്യനോട് ഏറ്റവും അടുത്ത ഗ്രഹം ഏതാണ്?', options: { A: 'ഭൂമി', B: 'ചൊവ്വ', C: 'ബുധൻ', D: 'വ്യാഴം' }, correctOption: 'C' },
  { order: 13, text: 'വെള്ളത്തിന്റെ രാസസൂത്രം ഏതാണ്?', options: { A: 'CO₂', B: 'O₂', C: 'H₂O', D: 'NaCl' }, correctOption: 'C' },
  { order: 14, text: 'മനുഷ്യ ശരീരത്തിൽ രക്തം പമ്പ് ചെയ്യുന്ന അവയവം ഏതാണ്?', options: { A: 'ശ്വാസകോശം', B: 'ഹൃദയം', C: 'കരൾ', D: 'വൃക്ക' }, correctOption: 'B' },
  { order: 15, text: 'ഒരു ആഴ്ചയിൽ എത്ര ദിവസങ്ങളുണ്ട്?', options: { A: '5', B: '6', C: '7', D: '8' }, correctOption: 'C' },
  { order: 16, text: 'ഒരു വർഷത്തിൽ സാധാരണയായി എത്ര മാസങ്ങളുണ്ട്?', options: { A: '10', B: '11', C: '12', D: '13' }, correctOption: 'C' },
  { order: 17, text: 'ഇന്ത്യയുടെ ദേശീയ കായികമായി പൊതുവെ അറിയപ്പെടുന്ന കായികം ഏതാണ്?', options: { A: 'ക്രിക്കറ്റ്', B: 'ഹോക്കി', C: 'ഫുട്ബോൾ', D: 'ടെന്നീസ്' }, correctOption: 'B' },
  { order: 18, text: 'കേരളത്തിന്റെ സംസ്ഥാന പുഷ്പം ഏതാണ്?', options: { A: 'കണിക്കൊന്ന', B: 'താമര', C: 'റോസ്', D: 'ചെമ്പരത്തി' }, correctOption: 'A' },
  { order: 19, text: 'കേരളപ്പിറവി ദിനം ഏത് തീയതിയിലാണ് ആഘോഷിക്കുന്നത്?', options: { A: 'ജനുവരി 26', B: 'ആഗസ്റ്റ് 15', C: 'നവംബർ 1', D: 'ഒക്ടോബർ 2' }, correctOption: 'C' },
  { order: 20, text: 'ഇന്ത്യയുടെ സ്വാതന്ത്ര്യദിനം ഏത് തീയതിയിലാണ്?', options: { A: 'ജനുവരി 26', B: 'ആഗസ്റ്റ് 15', C: 'ഒക്ടോബർ 2', D: 'നവംബർ 14' }, correctOption: 'B' }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB for seeding...');

  await Question.deleteMany({});
  await Question.insertMany(sampleQuestions);

  console.log(`Inserted ${sampleQuestions.length} questions.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
