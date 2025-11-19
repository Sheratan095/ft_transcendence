const app = document.getElementById('app');
const API_BASE = 'http://localhost:3000';

const form = document.getElementById('login-form') as HTMLFormElement | null;
const resultEl = document.getElementById('login-result') as HTMLDivElement | null;
const loginTfaContainer = document.getElementById('login-tfa-container') as HTMLDivElement | null;
const loginTfaCheckbox = document.getElementById('login-enable2fa') as HTMLInputElement | null;

import { getAccessToken, clearTokens, isLoggedInServerValidate, isLoggedInClient } from '../lib/auth.ts';

/** Reveal the login 2FA UI. Call this from other scripts or the console.
 * Example: window.showLogin2faOption && window.showLogin2faOption();
 */
export function showLogin2faOption() {
  if (!loginTfaContainer) return;
  loginTfaContainer.classList.remove('hidden');
  setTimeout(() => { loginTfaCheckbox?.focus(); }, 50);
}

if (typeof window !== 'undefined') {
  // @ts-ignore
  (window as any).showLogin2faOption = showLogin2faOption;
}

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

  const payload: Record<string, any> = { password };
    // backend login endpoint in tests expects "username", but accept email as fallback
    if (username) payload.mail = username;
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
        credentials: 'include',
        body: JSON.stringify(payload)
      });


      let body: any = null;
      try { body = await res.json(); } catch { body = null; }

      console.log('login response', res, body);

      if (res.ok) {
        if (body.tfaRequired == true) {
          resultEl.textContent = 'Two-factor authentication required. Please enter your 2FA code.';
          resultEl.className = 'text-sm mt-2 text-center text-yellow-600';
          // Here you would typically show a 2FA input field and handle that separately.
          return;
        }
        // expected response: { accessToken, refreshToken, user? }
        // if (body && body.tokens.accessToken) localStorage.setItem('accessToken', body.tokens.accessToken);
        // if (body && body.tokens.refreshToken) localStorage.setItem('refreshToken', body.tokens.accessToken);
        if (body && body.user.id) localStorage.setItem('userId', body.user.id);

        console.log('Storing userId in localStorage:', body);

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