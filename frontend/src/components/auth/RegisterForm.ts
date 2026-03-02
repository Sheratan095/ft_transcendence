import { SaveCurrentUserProfile } from '../../lib/auth';
import { createErrorContainer, showError, showSuccess, showLoading, hideError } from '../shared/ErrorMessage';
import { attachLogin } from './LoginForm';
import { goToRoute } from '../../spa';

export interface RegisterFormCallbacks {
  onLoginClick?: () => void;
}

export function createRegisterForm(callbacks?: RegisterFormCallbacks): void {
  // compatibility shim - attach to existing DOM
  attachRegister(callbacks);
}

export function attachRegister(callbacks?: RegisterFormCallbacks): void {
  const form = document.getElementById('register-form') as HTMLFormElement | null;
  if (!form) return;

  const registerSection = document.getElementById('register-section');
  if (registerSection) {
    registerSection.classList.remove("hidden");
  }
  // ensure the form itself is visible (in case it was hidden individually)
  form.classList.remove('hidden');
  if (form.dataset.attached === 'true') return;
  form.dataset.attached = 'true';
  const usernameInput = document.getElementById('register-username') as HTMLInputElement | null;
  const emailInput = document.getElementById('register-email') as HTMLInputElement | null;
  const passwordInput = document.getElementById('register-password') as HTMLInputElement | null;
  const authErrorEl = document.getElementById('register-error') as HTMLElement | null;
  const loginLink = document.getElementById('to-login-from-register') as HTMLAnchorElement | null;

  if (!usernameInput || !emailInput || !passwordInput) return;

  const errorEl = authErrorEl ?? createErrorContainer();

  if (loginLink) {
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      hideRegister();
      attachLogin();
    });
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    hideError(errorEl);

    const rawUsername = usernameInput.value.trim();
    const username = rawUsername.toLocaleLowerCase();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!username || !email || !password) {
      showError(errorEl, 'Enter username, email and password.');
      return;
    }

    // Enforce same constraints as change-username flow:
    // - length between 2 and 20
    // - only letters, numbers, underscores and dots
    if (username.length < 2 || username.length > 20) {
      showError(errorEl, 'Username must be between 2 and 20 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      showError(errorEl, 'Username may only contain letters, numbers, underscores and dots.');
      return;
    }

    showLoading(errorEl, 'Creating account...');

    try {
      const res = await fetch(`/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, email, password })
      });

      const body = await res.json().catch(() => null);
      if (res.ok) {
        if (body?.user?.id) {
          try {
				if (body && body.user.id) localStorage.setItem('userId', body.user.id);
				if (body && body.user) await SaveCurrentUserProfile(body.user);
          } catch (e) {
            // ignore storage
          }
        }
        showSuccess(errorEl, 'Registration successful.');
        window.location.href = "/profile";
      } else {
        showError(errorEl, (body && (body.message || body.error)) || `Register failed (${res.status})`);
      }
    } catch (err) {
      showError(errorEl, (err as Error).message || 'Network error');
    }
  });
}

export function hideRegister(): void {
  const form = document.getElementById('register-form') as HTMLFormElement | null;
  if (form) {
    form.classList.add("hidden");
    form.reset();
  }
  const section = document.getElementById('register-section');
  if (section) section.classList.add('hidden');
}
