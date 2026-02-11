import { goToRoute } from '../../spa';
import { createErrorContainer, showError, showSuccess, showLoading, hideError } from '../shared/ErrorMessage';

export interface TwoFactorFormCallbacks {
  onBackClick?: () => void;
}

export function createTwoFactorForm(callbacks?: TwoFactorFormCallbacks): void {
  // compatibility shim - attach to existing DOM
  attach2FA(callbacks);
}

export function attach2FA(callbacks?: TwoFactorFormCallbacks): void {
  const form = document.getElementById('2fa-form') as HTMLFormElement | null;
  if (!form) return;

  const pinContainer = form.querySelector('[data-pin-input]') as HTMLElement | null;
  const otpInputs = pinContainer ? Array.from(pinContainer.querySelectorAll('input')) as HTMLInputElement[] : [];
  const authErrorEl = document.getElementById('2fa-error') as HTMLElement | null;
  const backLink = form.querySelector('a[href="#"]') as HTMLAnchorElement | null;

  if (otpInputs.length === 0) return;

  const errorEl = authErrorEl ?? createErrorContainer();

  // Wire up input navigation
  otpInputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.value.length > 1) target.value = target.value[0];
      if (target.value && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) otpInputs[idx - 1].focus();
    });
  });

  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      goToRoute('/login');
    });
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    hideError(errorEl);

    const otpCode = otpInputs.map(i => i.value.trim()).join('');
    if (!otpCode || otpCode.length !== otpInputs.length) {
      showError(errorEl, 'Enter a complete verification code.');
      return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
      showError(errorEl, '2FA failed.');
      return;
    }

    showLoading(errorEl, 'Verifying...');

    try {
      const res = await fetch(`/api/auth/2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, otpCode })
      });

      const body = await res.json().catch(() => null);
      if (res.ok) {
        showSuccess(errorEl, '2FA verified successfully!');
        setTimeout(() => window.location.href = '/profile', 400);
      } else {
        showError(errorEl, (body && (body.message || body.error)) || `Verification failed (${res.status})`);
      }
    } catch (err) {
      showError(errorEl, (err as Error).message || 'Network error');
    }
  });
}

export function hide2FA(): void {
  const form = document.getElementById('2fa-form') as HTMLFormElement | null;
  if (form) {
    form.style.display = 'none';
    form.reset();
  }
  const errorEl = document.getElementById('2fa-error') as HTMLElement | null;
  if (errorEl) errorEl.style.display = 'none';
}
