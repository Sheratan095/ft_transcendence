import { createErrorContainer, showError, showSuccess, showLoading, hideError } from '../shared/ErrorMessage';
import { attachRegister } from './RegisterForm';
import { SaveCurrentUserProfile } from '../../lib/auth';
import { attach2FA } from './TwoFactorForm';
import { goToRoute } from '../../spa';
import { t } from '../../lib/intlayer';

export interface LoginFormCallbacks {
	onRegisterClick?: () => void;
}

export function createLoginForm(callbacks?: LoginFormCallbacks): void {
	// Kept for API compatibility with other modules that may call createLoginForm
	attachLogin();
}

export function attachLogin(): void {
	const form = document.getElementById('login-form') as HTMLFormElement | null;
	if (!form) return;

	if (form.dataset.attached === 'true') {
		// already attached
		form.classList.remove('hidden');
		return;
	}
	form.classList.remove('hidden');
	form.dataset.attached = 'true';
	const usernameInput = document.getElementById('email_log') as HTMLInputElement | null;
	const passwordInput = document.getElementById('password_log') as HTMLInputElement | null;
	const authErrorEl = document.getElementById('login-error') as HTMLElement | null;
	const registerLink = document.getElementById('to-register') as HTMLAnchorElement | null;

	if (registerLink) {
		registerLink.addEventListener('click', (e) => {
			e.preventDefault();

			// quick DOM checks before invoking register attach
			const regSection = document.getElementById('register-section');
			const regForm = document.getElementById('register-form');
			hideLogin();
			// ensure UI is visible even if attachRegister fails for some reason
			if (regSection) regSection.classList.remove('hidden');
			if (regForm) regForm.classList.remove('hidden');
			try {
				attachRegister();
			} catch (err) {
				console.error('attachLogin: attachRegister threw', err);
			}
		});
	}
	if (!usernameInput || !passwordInput) return;
	const errorEl = authErrorEl ?? createErrorContainer();

	form.addEventListener('submit', async (ev) => {
		ev.preventDefault();
		hideError(errorEl);

		const username = usernameInput.value.trim();
		const password = passwordInput.value;

		if (!username || !password) {
			showError(errorEl, t('auth.enterCredentials'));
			return;
		}

		showLoading(errorEl, t('auth.signingIn'));

		try {
			const body = await loginRequest(username, password);
			if (body && body.tfaRequired)
			{
				console.log('Login requires 2FA, showing 2FA form id:', body.userId);
				hideLogin();
				attach2FA(body.userId);
				return;
			}
			if (body && body.user.id)
				localStorage.setItem('userId', body.user.id);
			if (body && body.user && body.user.id)
				await SaveCurrentUserProfile(body.user.id);

			showSuccess(errorEl, t('auth.signedInSuccess'));
			goToRoute('/profile');
		}
		catch (err) {
			showError(errorEl, (err as Error).message || t('auth.loginFailed'));
		}
	});
}

export function hideLogin(): void
{
	const form = document.getElementById('login-form') as HTMLFormElement | null;
	if (form) {
		form.classList.add('hidden');
	}
}

export async function loginRequest(email: string, password: string): Promise<any> {
	try {
		const res = await fetch(`/api/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ email, password })
		});

		const body = await res.json().catch(() => null);
		if (res.ok) {
			return body;
		} else {
			const rawError = body && (body.message || body.error) ? (body.message || body.error) : t('auth.loginFailedWithStatus', { status: res.status });
			if (res.status === 429 || String(rawError).toLowerCase().includes('rate limit') || String(rawError).toLowerCase().includes('too many requests')) {
				const retryAfter = Number(body?.retryAfter);
				const rateLimitMsg = Number.isFinite(retryAfter) && retryAfter > 0
					? t('auth.rateLimitedRetry', { seconds: retryAfter })
					: t('auth.rateLimited');
				throw new Error(rateLimitMsg);
			}
			// Translate known backend error messages
			const errorMsg = rawError === 'Invalid credentials' ? t('auth.invalidCredentials') : rawError;
			throw new Error(errorMsg);
		}
	} catch (err) {
		const message = (err as Error).message || t('auth.loginRequestFailed');
		throw new Error(message);
	}
}
