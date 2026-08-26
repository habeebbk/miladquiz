const errorBox = document.getElementById('errorBox');

function showError(msg) {
  if (!errorBox) return;
  errorBox.textContent = msg;
  errorBox.classList.add('show');
}

// ---------- Login page ----------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  const loginBtn = document.getElementById('loginBtn');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.remove('show');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: document.getElementById('username').value.trim(),
          password: document.getElementById('password').value
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Login failed.');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Log In';
        return;
      }
      window.location.href = '/admin/dashboard.html';
    } catch (err) {
      showError('Network error. Please try again.');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Log In';
    }
  });
}

// ---------- Dashboard page ----------
const resultsBody = document.getElementById('resultsBody');
if (resultsBody) {
  const listView = document.getElementById('listView');
  const detailView = document.getElementById('detailView');
  const emptyMsg = document.getElementById('emptyMsg');
  const adminUserTag = document.getElementById('adminUserTag');
  const logoutBtn = document.getElementById('logoutBtn');
  const backLink = document.getElementById('backLink');

  let resultsCache = [];

  async function checkSession() {
    const res = await fetch('/api/admin/me');
    if (!res.ok) {
      window.location.href = '/admin/login.html';
      return false;
    }
    const data = await res.json();
    adminUserTag.textContent = `Logged in as ${data.username}`;
    return true;
  }

  async function loadResults() {
    const res = await fetch('/api/admin/results');
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || 'Could not load results.');
      return;
    }
    resultsCache = data.results;
    renderList();
  }

  function renderList() {
    resultsBody.innerHTML = '';
    if (!resultsCache.length) {
      emptyMsg.style.display = 'block';
      return;
    }
    emptyMsg.style.display = 'none';

    resultsCache.forEach(r => {
      const p = r.participantSnapshot || {};
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(p.name || '—')}</td>
        <td>${escapeHtml(p.phone || '—')}</td>
        <td>${escapeHtml(p.place || p.city || '—')}</td>
        <td><span class="score-tag">${r.score} / ${r.totalQuestions}</span></td>
        <td>${new Date(r.submittedAt).toLocaleString()}</td>
      `;
      tr.addEventListener('click', () => showDetail(r._id));
      resultsBody.appendChild(tr);
    });
  }

  async function showDetail(id) {
    const res = await fetch(`/api/admin/results/${id}`);
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || 'Could not load this result.');
      return;
    }
    const r = data.result;
    const p = r.participantSnapshot || {};

    document.getElementById('detailName').textContent = p.name || 'Participant';
    document.getElementById('detailMeta').textContent =
      `Phone: ${p.phone || '—'} · Place: ${p.place || p.city || '—'} · Submitted: ${new Date(r.submittedAt).toLocaleString()}`;
    document.getElementById('detailScore').textContent =
      `${r.score} / ${r.totalQuestions}  (Correct: ${r.correctCount}, Wrong: ${r.wrongCount}, Unanswered: ${r.unansweredCount})`;

    const answersDiv = document.getElementById('detailAnswers');
    answersDiv.innerHTML = '';
    r.answers.sort((a, b) => a.order - b.order).forEach(a => {
      const cls = !a.selectedOption ? 'blank' : (a.isCorrect ? 'correct' : 'wrong');
      const row = document.createElement('div');
      row.className = `detail-answer-row ${cls}`;
      row.innerHTML = `
        <strong>Q${a.order}.</strong> ${escapeHtml(a.questionText)}<br>
        Selected: <strong>${a.selectedOption || '—'}</strong> &nbsp;|&nbsp;
        Correct: <strong>${a.correctOption}</strong> &nbsp;|&nbsp;
        Time taken: ${a.timeTakenSeconds}s
      `;
      answersDiv.appendChild(row);
    });

    listView.style.display = 'none';
    detailView.style.display = 'block';
  }

  backLink.addEventListener('click', () => {
    detailView.style.display = 'none';
    listView.style.display = 'block';
  });

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  (async () => {
    const ok = await checkSession();
    if (ok) loadResults();
  })();
}
