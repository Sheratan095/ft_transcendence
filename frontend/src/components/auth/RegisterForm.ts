import { SaveCurrentUserProfile } from '../../lib/auth';
import { createErrorContainer, showError, showSuccess, showLoading, hideError } from '../shared/ErrorMessage';
import { attachLogin } from './LoginForm';
import { goToRoute } from '../../spa';
import { t } from '../../lib/intlayer';

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
      showError(errorEl, t('register.error.enterFields'));
      return;
    }

    // Enforce same constraints as change-username flow:
    // - length between 2 and 20
    // - only letters, numbers, underscores and dots
    if (username.length < 2 || username.length > 20) {
      showError(errorEl, t('register.error.usernameLength'));
      return;
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      showError(errorEl, t('register.error.usernameInvalidChars'));
      return;
    }

    showLoading(errorEl, t('register.creatingAccount'));

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
        showSuccess(errorEl, t('register.success'));
        window.location.href = "/profile";
      } else {
        const rawError = body && (body.details || body.message || body.error)
          ? (body.details || body.message || body.error)
          : t('register.error.failedWithStatus', { status: res.status });
        showError(errorEl, translateRegisterError(String(rawError), res.status, body?.retryAfter));
      }
    } catch (err) {
      const message = (err as Error).message || t('register.error.network');
      showError(errorEl, translateRegisterError(message));
    }
  });
}

function translateRegisterError(rawError: string, status?: number, retryAfter?: number): string {
  const normalized = rawError.trim().toLowerCase();

  const messageByExact: Record<string, string> = {
    'email already exists': t('register.error.emailExists'),
    'username already exists': t('register.error.usernameExists'),
    'password is too common.': t('register.error.passwordTooCommon'),
    'password is too similar to username or email.': t('register.error.passwordTooSimilar'),
    'Password must be between 8 and 24 characters long.': t('register.error.passwordTooShort'),
    'an unexpected error occurred during registration': t('register.error.unexpected'),
    'registration failed': t('register.error.failed'),
  };

  if (normalized in messageByExact) {
    return messageByExact[normalized];
  }

  if (normalized.startsWith('username ') && normalized.endsWith(' is not allowed.')) {
    return t('register.error.usernameNotAllowed');
  }

  if (normalized === 'failed to fetch' || normalized.includes('network')) {
    return t('register.error.network');
  }

  if (status === 429 || normalized.includes('rate limit') || normalized.includes('too many requests')) {
    if (typeof retryAfter === 'number' && Number.isFinite(retryAfter) && retryAfter > 0) {
      return t('auth.rateLimitedRetry', { seconds: retryAfter });
    }
    return t('auth.rateLimited');
  }

  if (status) {
    return t('register.error.failedWithStatus', { status });
  }

  return rawError || t('register.error.failed');
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
