import { SaveCurrentUserProfile } from '../../lib/auth';
import { createErrorContainer, showError, showSuccess, showLoading, hideError } from '../shared/ErrorMessage';
import { goToRoute } from '../../spa';
import { t } from '../../lib/intlayer';

function translateTwoFactorError(rawError: string, status?: number): string {
	const normalized = (rawError || '').toLowerCase();

	if (
		normalized.includes('invalid 2fa code') ||
		normalized.includes('invalid otp') ||
		normalized.includes('invalid code') ||
		status === 401
	) {
		return t('auth.2fa.invalid');
	}

	if (
		normalized.includes('no 2fa token found') ||
		normalized.includes('token has expired') ||
		normalized.includes('expired')
	) {
		return t('auth.2fa.expired');
	}

	if (status) {
		return t('auth.2fa.failedWithStatus', { status });
	}

	return t('auth.2fa.failedWithStatus', { status: 'unknown' });
}

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
			showError(errorEl, t('auth.2fa.enterCompleteCode'));
			return;
		}

		showLoading(errorEl, t('auth.2fa.verifying'));

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
				showSuccess(errorEl, t('auth.2fa.verifiedSuccess'));
				if (body && body.user.id)
					localStorage.setItem('userId', body.user.id);
				if (body && body.user && body.user.id)
					await SaveCurrentUserProfile(body.user.id);
			goToRoute('/profile');
				return;
			}
			else {
				const rawError = (body && (body.message || body.error)) || t('auth.2fa.failedWithStatus', { status: res.status });
				if (res.status === 429 || String(rawError).toLowerCase().includes('rate limit') || String(rawError).toLowerCase().includes('too many requests')) {
					const retryAfter = Number(body?.retryAfter);
					const rateLimitMsg = Number.isFinite(retryAfter) && retryAfter > 0
						? t('auth.rateLimitedRetry', { seconds: retryAfter })
						: t('auth.rateLimited');
					showError(errorEl, rateLimitMsg);
				} else {
					showError(errorEl, translateTwoFactorError(String(rawError), res.status));
				}
			}
		}
		catch (err)
		{
			showError(errorEl, (err as Error).message || t('auth.2fa.network'));
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
