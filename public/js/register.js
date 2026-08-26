const form = document.getElementById('registerForm');
const errorBox = document.getElementById('errorBox');
const startBtn = document.getElementById('startBtn');

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add('show');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.remove('show');
  startBtn.disabled = true;
  startBtn.textContent = 'Please wait...';

  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim().replace(/\D/g, '');
  const place = document.getElementById('place').value.trim();

  if (!name) {
    showError('Please enter your full name.');
    startBtn.disabled = false;
    startBtn.textContent = 'Start Test';
    return;
  }

  if (!phone || phone.length !== 10) {
    showError('Please enter a valid 10-digit phone number.');
    startBtn.disabled = false;
    startBtn.textContent = 'Start Test';
    return;
  }

  if (!place) {
    showError('Please enter your place.');
    startBtn.disabled = false;
    startBtn.textContent = 'Start Test';
    return;
  }

  const payload = { name, phone, place };

  try {
    const res = await fetch('/api/participant/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Something went wrong. Please try again.');
      startBtn.disabled = false;
      startBtn.textContent = 'Start Test';
      return;
    }

    sessionStorage.removeItem('omr_quiz_progress');
    window.location.href = '/quiz.html';
  } catch (err) {
    showError('Network error. Please check your connection and try again.');
    startBtn.disabled = false;
    startBtn.textContent = 'Start Test';
  }
});
