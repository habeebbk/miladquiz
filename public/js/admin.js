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
  const filterScore = document.getElementById('filterScore');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  let resultsCache = [];
  let filterVal = 'recent';

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

  function getDurationText(r) {
    if (r.startedAt && r.submittedAt) {
      const diff = Math.round((new Date(r.submittedAt) - new Date(r.startedAt)) / 1000);
      return ` (${diff}s)`;
    }
    return '';
  }

  function renderList() {
    resultsBody.innerHTML = '';
    if (!resultsCache.length) {
      emptyMsg.style.display = 'block';
      return;
    }

    let processed = [...resultsCache];

    if (filterVal === 'top-score') {
      processed.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        const durA = a.startedAt && a.submittedAt ? (new Date(a.submittedAt) - new Date(a.startedAt)) : Infinity;
        const durB = b.startedAt && b.submittedAt ? (new Date(b.submittedAt) - new Date(b.startedAt)) : Infinity;
        return durA - durB;
      });
    } else if (filterVal === 'perfect') {
      processed = processed.filter(r => r.score === r.totalQuestions);
      processed.sort((a, b) => {
        const durA = a.startedAt && a.submittedAt ? (new Date(a.submittedAt) - new Date(a.startedAt)) : Infinity;
        const durB = b.startedAt && b.submittedAt ? (new Date(b.submittedAt) - new Date(b.startedAt)) : Infinity;
        return durA - durB;
      });
    } else {
      processed.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    }

    if (!processed.length) {
      emptyMsg.style.display = 'block';
      return;
    }
    emptyMsg.style.display = 'none';

    processed.forEach(r => {
      const p = r.participantSnapshot || {};
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(p.name || '—')}</td>
        <td>${escapeHtml(p.phone || '—')}</td>
        <td>${escapeHtml(p.place || p.city || '—')}</td>
        <td><span class="score-tag">${r.score} / ${r.totalQuestions}</span>${getDurationText(r)}</td>
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

  filterScore.addEventListener('change', (e) => {
    filterVal = e.target.value;
    renderList();
  });

  exportCsvBtn.addEventListener('click', () => {
    if (!resultsCache || !resultsCache.length) {
      alert('No results available to export.');
      return;
    }

    const headers = ['Name', 'Phone', 'Place', 'Score', 'Total Questions', 'Correct', 'Wrong', 'Unanswered', 'Time Taken (s)', 'Submitted At'];
    const rows = [headers.join(',')];

    resultsCache.forEach(r => {
      const p = r.participantSnapshot || {};
      const name = (p.name || '').replace(/"/g, '""');
      const phone = (p.phone || '').replace(/"/g, '""');
      const place = (p.place || p.city || '').replace(/"/g, '""');

      const score = r.score;
      const total = r.totalQuestions;
      const correct = r.correctCount || 0;
      const wrong = r.wrongCount || 0;
      const unanswered = r.unansweredCount || 0;

      let duration = '';
      if (r.startedAt && r.submittedAt) {
        duration = Math.round((new Date(r.submittedAt) - new Date(r.startedAt)) / 1000);
      }

      const submittedAt = new Date(r.submittedAt).toLocaleString();

      rows.push([
        `"${name}"`,
        `"${phone}"`,
        `"${place}"`,
        score,
        total,
        correct,
        wrong,
        unanswered,
        duration,
        `"${submittedAt}"`
      ].join(','));
    });

    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `OMR_Quiz_Results_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

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
