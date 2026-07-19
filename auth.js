const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

// URL redirect helper
function getRedirectUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect') || 'index.html';
}

// Toggle Tabs
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  formLogin.classList.add('active');
  formRegister.classList.remove('active');
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  formRegister.classList.add('active');
  formLogin.classList.remove('active');
});

// Handle Login Submit
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();

  const emailOrUsername = document.getElementById('login-email-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emailOrUsername, password })
    });

    const data = await res.json();

    if (res.ok) {
      showToast(`Welcome back, ${data.username}!`, 'success');
      setTimeout(() => {
        window.location.href = getRedirectUrl();
      }, 1000);
    } else {
      showToast(data.error || 'Invalid credentials', 'error');
    }
  } catch (error) {
    console.error('Login submit error:', error);
    showToast('Network error during login.', 'error');
  }
});

// Handle Register Submit
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (res.ok) {
      showToast(`Registration successful! Welcome, ${data.username}!`, 'success');
      setTimeout(() => {
        window.location.href = getRedirectUrl();
      }, 1000);
    } else {
      showToast(data.error || 'Registration failed.', 'error');
    }
  } catch (error) {
    console.error('Registration submit error:', error);
    showToast('Network error during registration.', 'error');
  }
});
