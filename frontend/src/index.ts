const app = document.getElementById('app');
const API_BASE = 'http://localhost:3000';

const form = document.getElementById('login-form') as HTMLFormElement | null;
const resultEl = document.getElementById('login-result') as HTMLDivElement | null;

if (!form || !resultEl) {
  console.warn('Login form or result element not found in DOM.');
} else {
  const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const usernameEl = document.getElementById('username') as HTMLInputElement | null;
    const emailEl = document.getElementById('email') as HTMLInputElement | null;
    const passwordEl = document.getElementById('password') as HTMLInputElement | null;

    const username = usernameEl?.value.trim() ?? '';
    const email = emailEl?.value.trim() ?? '';
    const password = passwordEl?.value ?? '';

    if (!(username || email) || !password) {
      resultEl.textContent = 'Enter username (or email) and password.';
      resultEl.className = 'text-sm mt-2 text-center text-red-600';
      return;
    }

    const payload: Record<string, string> = { password };
    // backend login endpoint in tests expects "username", but accept email as fallback
    if (username) payload.username = username;
    else payload.email = email;

    if (submitBtn) submitBtn.disabled = true;
    resultEl.textContent = 'Signing in...';
    resultEl.className = 'text-sm mt-2 text-center text-gray-700';

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let body: any = null;
      try { body = await res.json(); } catch { body = null; }

      if (res.ok) {
        // expected response: { accessToken, refreshToken, user? }
        if (body && body.accessToken) localStorage.setItem('accessToken', body.accessToken);
        if (body && body.refreshToken) localStorage.setItem('refreshToken', body.refreshToken);
        resultEl.textContent = 'Login successful.';
        resultEl.className = 'text-sm mt-2 text-center text-green-600';
        // redirect to root or protected page
        setTimeout(() => { window.location.href = '/'; }, 600);
      } else {
        const message = (body && (body.message || body.error)) || res.statusText || `Login failed (${res.status})`;
        resultEl.textContent = message;
        resultEl.className = 'text-sm mt-2 text-center text-red-600';
        console.error('login failed', res.status, body);
      }
    } catch (err) {
      resultEl.textContent = (err as Error).message || 'Network error';
      resultEl.className = 'text-sm mt-2 text-center text-red-600';
      console.error('login error', err);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}