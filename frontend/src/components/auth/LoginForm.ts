import { createFormInput } from '../shared/FormInput';
import { initCardOverlay } from '../shared/Card';
import { goToRoute } from '../../spa';
import { createButton } from '../shared/Button';
import { createErrorContainer, showError, showSuccess, showLoading } from '../shared/ErrorMessage';

export interface LoginFormCallbacks {
  onRegisterClick: () => void;
}

export async function loginRequest(email: string, password: string): Promise<void> {
    try {
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const body = await res.json().catch(() => null);
      if (res.ok) {
		return;
	} else {
		const errorMsg = body && body.message ? body.message : `Login failed with status ${res.status}`;
		throw new Error(errorMsg);
	  }
	} catch (err) {
	  const message = (err as Error).message || 'Login request failed';
	  throw new Error(message);
	}
}
