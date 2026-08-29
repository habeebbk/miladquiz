document.addEventListener('DOMContentLoaded', async () => {
  const timerDisplay = document.getElementById('timerDisplay');
  const timerContainer = document.getElementById('timerContainer');
  const questionNum = document.getElementById('questionNum');
  const scoreTracker = document.getElementById('scoreTracker');
  const questionText = document.getElementById('questionText');
  const optionsContainer = document.getElementById('optionsContainer');
  const nextBtn = document.getElementById('nextBtn');
  const errorBox = document.getElementById('errorBox');
  const quizContainer = document.getElementById('quizContainer');

  const SESSION_KEY = 'omr_quiz_session';

  let questions = [];
  let secondsPerQuestion = 20;
  let currentIndex = 0;
  let userAnswers = {}; // { [index]: { questionId, selectedOption, timeTakenSeconds } }
  let remainingTimes = {}; // { [index]: secondsLeft }
  let selectedOption = null;
  let timerInterval = null;
  let currentTimerValue = 20;
  let startedAt = new Date().toISOString();

  function persistSession() {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        questions,
        secondsPerQuestion,
        currentIndex,
        userAnswers,
        remainingTimes,
        startedAt
      }));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  // Check if active session already exists in sessionStorage (e.g. after browser refresh)
  let existingSession = null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) existingSession = JSON.parse(raw);
  } catch (e) {
    existingSession = null;
  }

  if (existingSession && Array.isArray(existingSession.questions) && existingSession.questions.length > 0) {
    // Restore session completely from sessionStorage on refresh
    questions = existingSession.questions;
    secondsPerQuestion = existingSession.secondsPerQuestion || 20;
    currentIndex = typeof existingSession.currentIndex === 'number' ? existingSession.currentIndex : 0;
    userAnswers = existingSession.userAnswers || {};
    remainingTimes = existingSession.remainingTimes || {};
    startedAt = existingSession.startedAt || new Date().toISOString();

    renderQuestion();
  } else {
    // Fetch from Backend API on fresh start
    try {
      const res = await fetch('/api/quiz/questions');
      const data = await res.json();

      if (res.status === 401) {
        // Not registered -> redirect to registration
        window.location.href = '/';
        return;
      }

      if (res.status === 409) {
        // Already submitted
        window.location.href = '/thankyou.html';
        return;
      }

      if (!res.ok || !data.questions || data.questions.length === 0) {
        throw new Error(data.error || 'Failed to load quiz questions.');
      }

      questions = data.questions;
      secondsPerQuestion = data.secondsPerQuestion || 20;
      currentIndex = 0;
      userAnswers = {};
      remainingTimes = {};
      startedAt = new Date().toISOString();

      persistSession();
      renderQuestion();
    } catch (err) {
      showError(err.message || 'Error connecting to server. Please try again.');
      if (quizContainer) {
        quizContainer.innerHTML = '<p style="color:#ef4444; font-weight:600; padding:20px 0;">' + (err.message || 'Could not load quiz.') + '</p><a href="/" class="btn-submit" style="display:inline-block; text-decoration:none; text-align:center;">Back to Home</a>';
      }
    }
  }

  function renderQuestion() {
    if (timerInterval) clearInterval(timerInterval);

    const q = questions[currentIndex];
    const total = questions.length;

    // Restore previous selection if exists
    const previousAnswer = userAnswers[currentIndex];
    selectedOption = previousAnswer ? previousAnswer.selectedOption : null;

    if (questionNum) questionNum.textContent = `${currentIndex + 1} / ${total}`;
    if (scoreTracker) scoreTracker.textContent = `Question ${currentIndex + 1} of ${total}`;
    if (questionText) questionText.textContent = q.text;

    if (optionsContainer) {
      optionsContainer.innerHTML = '';
      const opts = ['A', 'B', 'C', 'D'];
      opts.forEach(key => {
        if (!q.options || !q.options[key]) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn' + (selectedOption === key ? ' selected' : '');
        btn.dataset.opt = key;
        btn.innerHTML = `
          <span class="option-badge">${key}</span>
          <span class="option-text">${escapeHtml(q.options[key])}</span>
        `;
        btn.addEventListener('click', () => {
          selectedOption = key;
          document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          saveCurrentAnswer();
        });
        optionsContainer.appendChild(btn);
      });
    }

    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.textContent = (currentIndex === total - 1) ? 'Submit Quiz' : 'Next Question';
    }

    // Determine remaining time for this specific question
    let timeLeft = remainingTimes[currentIndex] !== undefined ? remainingTimes[currentIndex] : secondsPerQuestion;
    currentTimerValue = timeLeft;

    if (timerDisplay) timerDisplay.textContent = `${Math.max(0, timeLeft)}s`;
    if (timerContainer) {
      timerContainer.style.color = (timeLeft <= 5) ? '#ef4444' : '#00B074';
    }

    timerInterval = setInterval(() => {
      timeLeft--;
      currentTimerValue = timeLeft;
      remainingTimes[currentIndex] = timeLeft;
      persistSession();

      if (timerDisplay) timerDisplay.textContent = `${Math.max(0, timeLeft)}s`;

      if (timeLeft <= 5 && timerContainer) {
        timerContainer.style.color = '#ef4444';
      }

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        handleNextQuestion();
      }
    }, 1000);

    persistSession();
  }

  function saveCurrentAnswer() {
    if (!questions[currentIndex]) return;
    const q = questions[currentIndex];
    const timeLeft = currentTimerValue !== undefined ? currentTimerValue : secondsPerQuestion;
    const timeSpent = Math.min(secondsPerQuestion, Math.max(1, secondsPerQuestion - timeLeft));

    remainingTimes[currentIndex] = timeLeft;
    userAnswers[currentIndex] = {
      questionId: q.id,
      selectedOption: selectedOption || null,
      timeTakenSeconds: timeSpent
    };
    persistSession();
  }

  function handleNextQuestion() {
    if (timerInterval) clearInterval(timerInterval);
    saveCurrentAnswer();

    currentIndex++;

    if (currentIndex < questions.length) {
      persistSession();
      renderQuestion();
    } else {
      submitQuiz();
    }
  }

  if (nextBtn) {
    nextBtn.onclick = handleNextQuestion;
  }

  async function submitQuiz() {
    if (timerInterval) clearInterval(timerInterval);

    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.textContent = 'Submitting Quiz...';
    }
    if (questionText) questionText.textContent = 'Submitting your responses...';
    if (optionsContainer) optionsContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;"><i class="ri-loader-4-line ri-spin" style="font-size:32px; color:#00B074;"></i><p style="margin-top:10px;">Please wait...</p></div>';

    // Compile final answers list
    const finalAnswers = questions.map((q, idx) => {
      const recorded = userAnswers[idx];
      return {
        questionId: q.id,
        selectedOption: recorded ? recorded.selectedOption : null,
        timeTakenSeconds: recorded ? recorded.timeTakenSeconds : secondsPerQuestion
      };
    });

    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          answers: finalAnswers,
          startedAt
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit quiz.');
      }

      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem('quiz_user');
      window.location.href = '/thankyou.html';
    } catch (err) {
      showError(err.message || 'Error submitting response. Please contact the administrator.');
      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.textContent = 'Retry Submit';
        nextBtn.onclick = () => submitQuiz();
      }
    }
  }

  function showError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    } else {
      alert(msg);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
