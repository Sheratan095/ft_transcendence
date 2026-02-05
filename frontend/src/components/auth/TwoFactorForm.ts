import { createFormInput } from '../shared/FormInput';
import { createCard } from '../shared/Card';
import { createButton } from '../shared/Button';
import { createErrorContainer, showError, showSuccess, showLoading } from '../shared/ErrorMessage';
import { goToRoute } from '../../spa';

export interface TwoFactorFormCallbacks {
  onBackClick: () => void;
}

export function createTwoFactorForm(callbacks: TwoFactorFormCallbacks): { form: HTMLFormElement; card: HTMLDivElement } {
  const card = createCard({ shadowColor: '#0dff66' });
  const form = document.createElement('form');
  form.id = '2fa-form';
  form.noValidate = true;
  form.className = 'w-full max-w-2xl space-y-4';

  // Title
  const title = document.createElement('h1');
  title.className = 'text-3xl font-bold text-left mb-2 text-white';
  title.textContent = 'Two-Factor Authentication';

  // Description
  const desc = document.createElement('p');
  desc.className = 'text-xl text-neutral-400 mb-4 text-left';
  desc.textContent = 'Enter the 6-digit code sent to your email.';

  // OTP code input
  const { wrapper: otpWrap, input: otpInput } = createFormInput({
    id: 'otp-code',
    name: 'otpCode',
    label: '2FA Code',
    type: 'text',
    placeholder: '000000',
    inputMode: 'numeric',
    maxLength: 6,
    focusRingColor: '#0dff66'
  });
  
  // Add special styling for OTP input
  otpInput.className = 'w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#0dff66] text-center text-2xl tracking-widest';

  // Submit button
  const submit = createButton({
    text: 'Verify',
    color: '#0dff66'
  });

  // Footer with back link
  const footer = document.createElement('div');
  footer.className = 'mt-4 text-xl text-neutral-400 text-center';
  const backLink = document.createElement('a');
  backLink.id = 'back-to-login';
  backLink.href = '#';
  backLink.className = 'text-[#0dff66] hover:underline';
  backLink.textContent = 'Back to login';
  footer.appendChild(backLink);

  // Error container
  const authError = createErrorContainer();

  // Assemble form
  form.appendChild(title);
  form.appendChild(desc);
  form.appendChild(otpWrap);
  form.appendChild(submit);
  form.appendChild(footer);

  // Assemble card
  card.appendChild(form);
  card.appendChild(authError);

  // Setup event listeners
  backLink.addEventListener('click', (e) => {
    e.preventDefault();
    callbacks.onBackClick();
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    showLoading(authError, 'Verifying...');
    
    const otpCode = otpInput.value.trim();

    if (!otpCode || otpCode.length !== 6) {
      showError(authError, 'Enter a 6-digit code.');
      return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
      showError(authError, 'TFA failed.');
      return;
    }

    try {
      const res = await fetch(`/api/auth/2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, otpCode })
      });

      const body = await res.json().catch(() => null);
      if (res.ok) {
        console.log('2FA verification successful:', body);
        showSuccess(authError, '2FA verified successfully!');
        setTimeout(() => { goToRoute('/'); }, 600);
      } else {
        showError(authError, (body && (body.message || body.error)) || `Verification failed (${res.status})`);
      }
    } catch (err) {
      showError(authError, (err as Error).message || 'Network error');
    }
  });

  return { form, card };
}
