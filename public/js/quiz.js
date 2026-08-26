const errorBox = document.getElementById('errorBox');
const loadingMsg = document.getElementById('loadingMsg');
const quizSheet = document.getElementById('quizSheet');
const qCounter = document.getElementById('qCounter');
const qNumber = document.getElementById('qNumber');
const qText = document.getElementById('qText');
const optionsList = document.getElementById('optionsList');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressRow = document.getElementById('progressRow');
const timerRing = document.getElementById('timerRing');
const timerCircle = document.getElementById('timerCircle');
const timerNum = document.getElementById('timerNum');
const stampFlash = document.getElementById('stampFlash');

const CIRCUMFERENCE = 2 * Math.PI * 24; // r=24
timerCircle.style.strokeDasharray = CIRCUMFERENCE;

const STORAGE_KEY = 'omr_quiz_progress';

let questions = [];
let secondsPerQuestion = 20;
let currentIndex = 0;
let selectedOption = null;
let answers = []; // { questionId, selectedOption, timeTakenSeconds }
let questionRemainingTime = []; // Stores remaining seconds per question
let timeLeft = 20;
let timerInterval = null;
let testStartedAt = new Date().toISOString();

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add('show');
  loadingMsg.style.display = 'none';
}

function saveStateToStorage() {
  saveCurrentState();
  const state = {
    testStartedAt,
    currentIndex,
    answers,
    questionRemainingTime,
    lastSavedTimestamp: Date.now()
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

async function init() {
  try {
    const res = await fetch('/api/quiz/questions');
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Could not start the test.');
      sessionStorage.removeItem(STORAGE_KEY);
      setTimeout(() => { window.location.href = '/'; }, 2000);
      return;
    }

    questions = data.questions;
    secondsPerQuestion = data.secondsPerQuestion || 20;

    if (!questions.length) {
      showError('No questions are available right now. Please contact the organizer.');
      return;
    }

    // Check if there is saved progress from before a page refresh
    let hasSavedState = false;
    try {
      const savedRaw = sessionStorage.getItem(STORAGE_KEY);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved && Array.isArray(saved.answers) && saved.answers.length === questions.length) {
          testStartedAt = saved.testStartedAt || testStartedAt;
          currentIndex = (typeof saved.currentIndex === 'number' && saved.currentIndex >= 0 && saved.currentIndex < questions.length)
            ? saved.currentIndex
            : 0;
          answers = saved.answers;
          questionRemainingTime = Array.isArray(saved.questionRemainingTime)
            ? saved.questionRemainingTime
            : questions.map(() => secondsPerQuestion);

          // Deduct elapsed time that passed during the browser refresh
          if (saved.lastSavedTimestamp) {
            const elapsedSeconds = Math.max(0, Math.floor((Date.now() - saved.lastSavedTimestamp) / 1000));
            if (elapsedSeconds > 0 && questionRemainingTime[currentIndex] > 0) {
              questionRemainingTime[currentIndex] = Math.max(0, questionRemainingTime[currentIndex] - elapsedSeconds);
            }
          }
          hasSavedState = true;
        }
      }
    } catch (e) {
      console.warn('Could not restore saved quiz state:', e);
    }

    if (!hasSavedState) {
      testStartedAt = new Date().toISOString();
      currentIndex = 0;
      questionRemainingTime = questions.map(() => secondsPerQuestion);
      answers = questions.map(q => ({
        questionId: q.id,
        selectedOption: null,
        timeTakenSeconds: 0
      }));
    }

    buildProgressDots();
    loadingMsg.style.display = 'none';
    quizSheet.style.display = 'block';
    renderQuestion();
  } catch (err) {
    showError('Network error while loading the test. Please refresh.');
  }
}

function buildProgressDots() {
  progressRow.innerHTML = '';
  questions.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'progress-dot';
    dot.id = `dot-${i}`;
    dot.title = `Question ${i + 1}`;
    dot.style.cursor = 'pointer';
    dot.addEventListener('click', () => {
      if (i !== currentIndex) {
        saveStateToStorage();
        currentIndex = i;
        renderQuestion();
      }
    });
    progressRow.appendChild(dot);
  });
}

function updateProgressDots() {
  questions.forEach((_, i) => {
    const dot = document.getElementById(`dot-${i}`);
    if (!dot) return;
    dot.classList.remove('answered', 'current', 'skipped');
    if (i === currentIndex) {
      dot.classList.add('current');
    } else if (answers[i] && answers[i].selectedOption) {
      dot.classList.add('answered');
    } else if (questionRemainingTime[i] <= 0) {
      dot.classList.add('skipped');
    }
  });
}

function renderQuestion() {
  clearInterval(timerInterval);

  const q = questions[currentIndex];
  stampFlash.classList.remove('show');

  // Update back / next button states
  if (prevBtn) {
    prevBtn.style.visibility = currentIndex > 0 ? 'visible' : 'hidden';
  }
  nextBtn.textContent = (currentIndex === questions.length - 1) ? 'Submit Test' : 'Next →';

  // Restore existing answer for this question
  selectedOption = (answers[currentIndex] && answers[currentIndex].selectedOption) || null;

  // Restore remaining time for this question
  timeLeft = questionRemainingTime[currentIndex] !== undefined
    ? questionRemainingTime[currentIndex]
    : secondsPerQuestion;

  qCounter.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
  qNumber.textContent = `Question ${String(currentIndex + 1).padStart(2, '0')}`;
  qText.textContent = q.text;

  optionsList.innerHTML = '';
  const isTimeUp = timeLeft <= 0;

  ['A', 'B', 'C', 'D'].forEach(letter => {
    const opt = document.createElement('div');
    opt.className = 'option';
    if (selectedOption === letter) opt.classList.add('selected');
    if (isTimeUp) opt.style.pointerEvents = 'none';

    opt.dataset.letter = letter;
    opt.innerHTML = `
      <div class="bubble"><div class="fill"></div><span class="letter">${letter}</span></div>
      <div class="option-text">${q.options[letter]}</div>
    `;
    if (!isTimeUp) {
      opt.addEventListener('click', () => selectOption(letter, opt));
    }
    optionsList.appendChild(opt);
  });

  updateProgressDots();

  if (isTimeUp) {
    stampFlash.classList.add('show');
    timerRing.classList.add('warn');
    updateTimerDisplay();
  } else {
    startTimer();
  }
}

function selectOption(letter, el) {
  selectedOption = letter;
  if (!answers[currentIndex]) {
    answers[currentIndex] = { questionId: questions[currentIndex].id, selectedOption: null, timeTakenSeconds: 0 };
  }
  answers[currentIndex].selectedOption = letter;

  document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  saveStateToStorage();
  updateProgressDots();
}

function startTimer() {
  clearInterval(timerInterval);
  timerRing.classList.remove('warn');
  updateTimerDisplay();

  if (timeLeft <= 5) timerRing.classList.add('warn');

  timerInterval = setInterval(() => {
    timeLeft -= 1;
    questionRemainingTime[currentIndex] = Math.max(0, timeLeft);
    updateTimerDisplay();
    saveStateToStorage();

    if (timeLeft <= 5) timerRing.classList.add('warn');

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeout();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const displaySec = Math.max(timeLeft, 0);
  timerNum.textContent = displaySec;
  const fraction = displaySec / secondsPerQuestion;
  const offset = CIRCUMFERENCE * (1 - fraction);
  timerCircle.style.strokeDashoffset = offset;
}

function saveCurrentState() {
  const timeSpent = secondsPerQuestion - Math.max(0, questionRemainingTime[currentIndex] || 0);
  if (!answers[currentIndex]) {
    answers[currentIndex] = {
      questionId: questions[currentIndex]?.id,
      selectedOption: null,
      timeTakenSeconds: timeSpent
    };
  }
  answers[currentIndex].questionId = questions[currentIndex]?.id;
  answers[currentIndex].selectedOption = selectedOption;
  answers[currentIndex].timeTakenSeconds = timeSpent;
}

function handleTimeout() {
  questionRemainingTime[currentIndex] = 0;
  saveStateToStorage();
  stampFlash.classList.add('show');
  updateProgressDots();
  setTimeout(() => {
    advance();
  }, 700);
}

function advance() {
  saveStateToStorage();
  if (currentIndex < questions.length - 1) {
    currentIndex += 1;
    renderQuestion();
  } else {
    submitQuiz();
  }
}

if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    if (currentIndex > 0) {
      saveStateToStorage();
      currentIndex -= 1;
      if (questionRemainingTime[currentIndex] !== undefined) {
        questionRemainingTime[currentIndex] = Math.max(0, questionRemainingTime[currentIndex] - 1);
      }
      renderQuestion();
    }
  });
}

nextBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  advance();
});

async function submitQuiz() {
  clearInterval(timerInterval);
  saveCurrentState();

  quizSheet.innerHTML = `<div class="sheet-body"><p style="font-family:var(--font-mono); color:var(--utility-olive);">Submitting your answers...</p></div>`;

  try {
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, startedAt: testStartedAt })
    });
    const data = await res.json();

    if (!res.ok) {
      quizSheet.innerHTML = `<div class="sheet-body"><div class="error-box show">${data.error || 'Could not submit. Please contact the organizer.'}</div></div>`;
      return;
    }
    // Clear session storage upon successful submission
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.href = '/thankyou.html';
  } catch (err) {
    quizSheet.innerHTML = `<div class="sheet-body"><div class="error-box show">Network error while submitting. Please contact the organizer if this persists.</div></div>`;
  }
}

init();
