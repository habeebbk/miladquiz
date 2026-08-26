# OMR Quiz Competition Website

A full quiz-competition website:
- Collects participant details first (name, email, phone, roll no, city).
- Then runs a 20-question, OMR-style (A/B/C/D bubble) test, **one question at a time**, **30 seconds per question**, auto-advancing on timeout.
- After submission, the participant only sees a "your response has been recorded" page — **no score or result is ever shown to them**.
- All answers and scores are stored in **MongoDB**.
- Only an **admin** (single login) can view the results register and per-participant detail.

## 1. Requirements
- Node.js 18+
- A MongoDB database (local `mongod`, or a free MongoDB Atlas cluster)

## 2. Setup

```bash
cd omr-quiz-app
npm install
cp .env.example .env
```

Edit `.env`:
```
MONGODB_URI=mongodb://127.0.0.1:27017/omr_quiz      # or your Atlas connection string
PORT=3000
JWT_SECRET=some-long-random-string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-strong-password
TOTAL_QUESTIONS=20
SECONDS_PER_QUESTION=30
```

Load the sample 20 questions into MongoDB (edit `seed.js` first to put in your own questions):
```bash
npm run seed
```

Start the server:
```bash
npm start
```

Visit:
- `http://localhost:3000/` — participant registration → test → thank-you page
- `http://localhost:3000/admin/login.html` — admin login → results dashboard

## 3. How the flow works

1. **Registration** (`/`) — participant fills name, email, phone (roll no. and city optional). A session cookie (`participant_id`, httpOnly) is set. One email can only complete the test once.
2. **Test** (`/quiz.html`) — questions are fetched from `/api/quiz/questions` *without* the correct answers. Each question shows 4 bubble options (A–D). A 30-second ring timer counts down; if time runs out, the question is marked and the test auto-advances ("TIME UP" stamp). Progress dots along the top show answered / current / skipped questions.
3. **Submit** — on the last question, all answers are POSTed to `/api/quiz/submit`. The server (not the browser) computes the score against the real answer key, stores a `Result` document, and marks the participant as having submitted. The JSON response back to the browser contains **no score data** — only a confirmation message.
4. **Thank-you page** (`/thankyou.html`) — static confirmation, no result.
5. **Admin** (`/admin/login.html` → `/admin/dashboard.html`) — logs in with the single admin account from `.env`, gets an httpOnly JWT cookie, and can view:
   - A register/list of every submission (name, email, phone, score, submitted time).
   - Click a row to see the full per-question breakdown (selected vs. correct answer, correct/wrong/unanswered, time taken per question).

## 4. Changing the questions
Edit the `sampleQuestions` array in `seed.js` (or write directly into the `questions` collection in MongoDB) — each question needs `order` (1–20), `text`, `options.A–D`, and `correctOption`. Re-run `npm run seed` to replace the question bank.

## 5. Notes on security / production use
- Change `JWT_SECRET` and `ADMIN_PASSWORD` before deploying.
- Serve over HTTPS in production so cookies are protected in transit (add `secure: true` to the cookie options in `routes/participant.js`, `routes/quiz.js`, and `routes/admin.js` once you're on HTTPS).
- If you want to allow re-attempts, remove the `hasSubmitted` check in `routes/participant.js` and `routes/quiz.js`.
- The 30-second timer is enforced by the browser (auto-advance) and the elapsed time is also recorded server-side per answer for the admin's reference; if you need it to be tamper-proof against a modified client, add a server-side per-question deadline check when `/api/quiz/submit` is called.
