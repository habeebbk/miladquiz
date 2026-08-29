document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const errorBox = document.getElementById('errorBox');
  const startBtn = document.getElementById('startBtn');

  if (!registerForm) return;

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const place = document.getElementById('place').value.trim();

    if (!name || !phone || !place) {
      showError('Please fill in all required fields.');
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      showError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = 'Starting Quiz...';
    }

    try {
      const response = await fetch('/api/participant/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, phone, place })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed. Please try again.');
      }

      // Clear any previous quiz state and store new participant details
      sessionStorage.removeItem('omr_quiz_session');
      sessionStorage.setItem('quiz_user', JSON.stringify({
        name,
        phone,
        place,
        participantId: data.participantId
      }));

      // Redirect to quiz page
      window.location.href = '/quiz.html';
    } catch (err) {
      showError(err.message);
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Quiz';
      }
    }
  });

  function showError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    } else {
      alert(msg);
    }
  }

  function hideError() {
    if (errorBox) {
      errorBox.style.display = 'none';
      errorBox.textContent = '';
    }
  }
});
