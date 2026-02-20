import { SaveCurrentUserProfile } from '../../lib/auth';
import { createErrorContainer, showError, showSuccess, showLoading, hideError } from '../shared/ErrorMessage';
import { goToRoute } from '../../spa';

export interface TwoFactorFormCallbacks
{
	onBackClick?: () => void;
}

export function createTwoFactorForm(callbacks?: TwoFactorFormCallbacks): void
{
	// compatibility shim - attach to existing DOM
	attach2FA(callbacks);
}

export function attach2FA(userId, callbacks?: TwoFactorFormCallbacks): void
{
	const	form = document.getElementById('2fa-form') as HTMLFormElement | null;
	if (!form)
		return;

	const	section = document.getElementById('2fa-section');
	if (section)
		section.classList.remove('hidden');

	const	pinContainer = form.querySelector('[data-pin-input]') as HTMLElement | null;
	const	otpInputs = pinContainer ? Array.from(pinContainer.querySelectorAll('input')) as HTMLInputElement[] : [];
	const	hiddenInput = document.getElementById('2fa-otp-hidden') as HTMLInputElement | null;
	const	authErrorEl = document.getElementById('2fa-error') as HTMLElement | null;

	if (otpInputs.length === 0)
		return;

	const	errorEl = authErrorEl ?? createErrorContainer();

	// Wire up input navigation, filtering, paste and arrow na vigation
	otpInputs.forEach((input, idx) =>
	{
		input.addEventListener('input', (e) =>
		{
			const	target = e.target as HTMLInputElement;
			// keep only digits
			target.value = (target.value || '').replace(/\D/g, '');

			if (target.value.length > 1)
				target.value = target.value[0];

			if (target.value && idx < otpInputs.length - 1)
				otpInputs[idx + 1].focus();
		});

		input.addEventListener('paste', (ev) =>
		{
			ev.preventDefault();
			const clipboard = (ev as ClipboardEvent).clipboardData?.getData('text') || '';
			const digits = (clipboard || '').replace(/\D/g, '').split('').slice(0, otpInputs.length);
			if (digits.length === 0)
				return;
			digits.forEach((d, i) => { otpInputs[i].value = d; });
			const next = Math.min(digits.length, otpInputs.length - 1);
			otpInputs[next].focus();
		});

		input.addEventListener('keydown', (e) =>
		{
			if (e.key === 'Backspace' && !input.value && idx > 0)
				otpInputs[idx - 1].focus();

			if (e.key === 'ArrowLeft' && idx > 0)
				otpInputs[idx - 1].focus();

			if (e.key === 'ArrowRight' && idx < otpInputs.length - 1)
				otpInputs[idx + 1].focus();
		});
	});

	// Support OS autofill/one-time-code: listen to the hidden single input
	if (hiddenInput)
	{
		hiddenInput.addEventListener('input', () =>
		{
			const val = (hiddenInput.value || '').replace(/\D/g, '');
			if (!val)
				return;
			const digits = val.split('').slice(0, otpInputs.length);
			digits.forEach((d, i) => { otpInputs[i].value = d; });
			const last = Math.min(digits.length - 1, otpInputs.length - 1);
			if (last >= 0)
				otpInputs[last].focus();
		});

		// some platforms trigger a paste event instead of filling input; handle paste on hidden too
		hiddenInput.addEventListener('paste', (ev) =>
		{
			ev.preventDefault();
			const clipboard = (ev as ClipboardEvent).clipboardData?.getData('text') || '';
			const digits = (clipboard || '').replace(/\D/g, '').split('').slice(0, otpInputs.length);
			if (digits.length === 0)
				return;
			digits.forEach((d, i) => { otpInputs[i].value = d; });
			const next = Math.min(digits.length, otpInputs.length - 1);
			otpInputs[next].focus();
		});
	}

	form.addEventListener('submit', async (ev) =>
	{
		ev.preventDefault();
		hideError(errorEl);

		const	otpCode = otpInputs.map(i => i.value.trim()).join('');
		if (!otpCode || otpCode.length !== otpInputs.length)
		{
			showError(errorEl, 'Enter a complete verification code.');
			return;
		}

		showLoading(errorEl, 'Verifying...');

		try
		{
			const res = await fetch(`/api/auth/2fa`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ userId, otpCode })
			});

			const body = await res.json().catch(() => null);
			if (body && body.user)
				await SaveCurrentUserProfile(body.user);
	
			if (res.ok)
			{
				showSuccess(errorEl, '2FA verified successfully!');
				if (body && body.user.id)
					localStorage.setItem('userId', body.user.id);
				if (body && body.user && body.user.id)
					await SaveCurrentUserProfile(body.user.id);
			goToRoute('/profile');
				return;
			}
			else
					showError(errorEl, (body && (body.message || body.error)) || `Verification failed (${res.status})`);
		}
		catch (err)
		{
			showError(errorEl, (err as Error).message || 'Network error');
		}
	});
}

export function	hide2FA(): void
{
	const	form = document.getElementById('2fa-form') as HTMLFormElement | null;
	if (form)
	{
		form.style.display = 'none';
		form.reset();
	}

	const	errorEl = document.getElementById('2fa-error') as HTMLElement | null;
	if (errorEl)
		errorEl.style.display = 'none';
}
