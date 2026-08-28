// Run with: npm run seed
// Replace the sampleQuestions array with your own 20 questions before going live.
require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('./models/Question');

const sampleQuestions = [
  { order: 1, text: 'നബി ﷺ യുടെ പിതാവിന്റെയും മാതാവിന്റെയും പരമ്പര കൂട്ടിമുട്ടുന്ന ഉപ്പാപ്പ ആര്?', options: { A: 'ലുഅയ്യ്', B: 'മുർറ', C: 'കിലാബ്', D: 'ഖുസ്വയ്യ്' }, correctOption: 'C' },
  { order: 2, text: 'അബൂ ത്വാലിബിനോടൊപ്പം നബി ﷺ ശാമിലേക്ക് യാത്ര ചെയ്യുമ്പോൾ നബി ﷺ യുടെ വയസ്സ് എത്രയായിരുന്നു?', options: { A: '9', B: '10', C: '12', D: '25' }, correctOption: 'C' },
  { order: 3, text: 'ഖദീജാ (റ)യുടെ കച്ചവടവുമായി നബി ﷺ ശാമിലേക്ക് പോയപ്പോൾ കൂടെയുണ്ടായിരുന്ന അടിമയുടെ പേര് എന്തായിരുന്നു?', options: { A: 'സൈദ്', B: 'മൈസറ', C: 'റബാഹ്', D: 'ശഖ്റാൻ' }, correctOption: 'B' },
  { order: 4, text: 'ഖുറൈശികൾ കഅ്ബ പുതുക്കിപ്പണിയുമ്പോൾ നബി ﷺ യുടെ വയസ്സ് എത്രയായിരുന്നു?', options: { A: '25', B: '30', C: '35', D: '40' }, correctOption: 'C' },
  { order: 5, text: 'ഹിറാഅ് ഗുഹയിൽ വെച്ച് ജിബ്‌രീൽ (അ) നബി ﷺ ക്ക് ആദ്യമായി ആയത്ത് ഓതിക്കൊടുത്ത ദിവസം ഏതാണ്?', options: { A: 'വെള്ളി', B: 'തിങ്കൾ', C: 'വ്യാഴം', D: 'ഞായർ' }, correctOption: 'B' },
  { order: 6, text: 'നുബുവ്വത്തിന്റെ എത്രാമത്തെ വർഷമാണ് ‘ദുഃഖവർഷം’ (ആമുൽ ഹുസ്ൻ) എന്നറിയപ്പെടുന്നത്?', options: { A: '8', B: '9', C: '10', D: '11' }, correctOption: 'C' },
  { order: 7, text: 'ഇസ്റാഅ്-മിഅ്റാജ് നടന്നത് നുബുവ്വത്തിന്റെ ഏത് വർഷത്തിലായിരുന്നു?', options: { A: '10', B: '11', C: '12', D: '13' }, correctOption: 'B' },
  { order: 8, text: 'മക്കയിൽ നബി ﷺ എത്ര വർഷമാണ് രഹസ്യമായി പ്രബോധനം നടത്തിയത്?', options: { A: '2 വർഷം', B: '3 വർഷം', C: '5 വർഷം', D: '7 വർഷം' }, correctOption: 'B' },
  { order: 9, text: 'നബി ﷺ ക്കും ഖദീജാ (റ)ക്കും പിറന്ന ആദ്യത്തെ കണ്മണി ആരായിരുന്നു?', options: { A: 'അബ്ദുല്ലാഹ്', B: 'ഇബ്രാഹീം', C: 'ഖാസിം', D: 'ത്വയ്യിബ്' }, correctOption: 'C' },
  { order: 10, text: '‘ബതൂൽ’ എന്ന് ഓമനപ്പേരുള്ള നബി ﷺ യുടെ മകൾ ആരാണ്?', options: { A: 'റുഖിയ്യ (റ)', B: 'സൈനബ് (റ)', C: 'ഉമ്മു കുൽസൂം (റ)', D: 'ഫാത്വിമതുസ്സഹ്റ (റ)' }, correctOption: 'D' },
  { order: 11, text: 'ആയിഷാ ബീവി (റ)യെ നബി ﷺ വിവാഹം കഴിച്ചത് ഏത് മാസത്തിലായിരുന്നു?', options: { A: 'റമദാൻ', B: 'ശവ്വാൽ', C: 'റബീഉൽ അവ്വൽ', D: 'മുഹറം' }, correctOption: 'B' },
  { order: 12, text: 'ആയിഷാ ബീവി (റ)യുമായി നബി ﷺ വീട് കൂടുമ്പോൾ (താമസം തുടങ്ങുമ്പോൾ) ആയിഷാ ബീവിയുടെ വയസ്സ് എത്രയായിരുന്നു?', options: { A: '6', B: '7', C: '9', D: '11' }, correctOption: 'C' },
  { order: 13, text: 'നബി ﷺ യുടെ ഭാര്യമാരിൽ അനറബി ആയിരുന്ന ഭാര്യ ആരായിരുന്നു?', options: { A: 'മർയം (റ)', B: 'സഫിയ്യ (റ)', C: 'ജുവൈരിയ്യ (റ)', D: 'മൈമൂന (റ)' }, correctOption: 'B' },
  { order: 14, text: 'സ്ത്രീകളിൽ ആദ്യമായി ഇസ്‌ലാം സ്വീകരിച്ചത് ആരായിരുന്നു?', options: { A: 'ആയിഷ (റ)', B: 'സുമയ്യ (റ)', C: 'ഖദീജ (റ)', D: 'ഫാത്വിമ (റ)' }, correctOption: 'C' },
  { order: 15, text: 'നബി ﷺ ക്ക് എത്ര മക്കളുണ്ടായിരുന്നു?', options: { A: '6', B: '7', C: '8', D: '4' }, correctOption: 'B' },
  { order: 16, text: 'നബി ﷺ യുടെ വഫാത്തിന്റെ സമയത്ത് ജീവിച്ചിരിപ്പുണ്ടായിരുന്ന മകൾ ആരായിരുന്നു?', options: { A: 'സൈനബ് (റ)', B: 'റുഖിയ്യ (റ)', C: 'ഉമ്മു കുൽസൂം (റ)', D: 'ഫാത്വിമതുസ്സഹ്റ (റ)' }, correctOption: 'D' },
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
