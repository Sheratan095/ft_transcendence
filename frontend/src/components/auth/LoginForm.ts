import { createFormInput } from '../shared/FormInput';
import { createCard } from '../shared/Card';
import { createButton } from '../shared/Button';
import { createErrorContainer, showError, showSuccess, showLoading } from '../shared/ErrorMessage';

export interface LoginFormCallbacks {
  onRegisterClick: () => void;
}

export function createLoginForm(callbacks: LoginFormCallbacks): { form: HTMLFormElement; card: HTMLDivElement } {
  const card = createCard({ shadowColor: '#0dff66' });
  const form = document.createElement('form');
  form.id = 'login-form';
  form.noValidate = true;
  form.className = 'w-full max-w-2xl space-y-4';

  // Title
  const title = document.createElement('h1');
  title.className = 'text-3xl font-bold text-left mb-2 text-white';
  title.textContent = 'Log in';

  // Description
  const desc = document.createElement('p');
  desc.className = 'text-xl text-neutral-400 mb-4 text-left';
  desc.textContent = 'Welcome back — enter your credentials.';

  // Email field
  const { wrapper: emailWrap, input: emailInput } = createFormInput({
    id: 'email',
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    focusRingColor: '#0dff66'
  });

  // Password field
  const { wrapper: passWrap, input: passInput } = createFormInput({
    id: 'password',
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: '••••••••',
    focusRingColor: '#0dff66'
  });

  // Submit button
  const submit = createButton({
    text: 'Sign in',
    color: '#0dff66'
  });

  // Footer with register link
  const footer = document.createElement('div');
  footer.className = 'mt-4 text-xl text-neutral-400 text-center';
  const span = document.createElement('span');
  span.textContent = "Don't have an account? ";
  const createLink = document.createElement('a');
  createLink.id = 'to-register';
  createLink.href = '#';
  createLink.className = 'text-[#0dff66] hover:underline';
  createLink.textContent = 'Create one';
  footer.appendChild(span);
  footer.appendChild(createLink);

  // Error container
  const authError = createErrorContainer();

  // Assemble form
  form.appendChild(title);
  form.appendChild(desc);
  form.appendChild(emailWrap);
  form.appendChild(passWrap);
  form.appendChild(submit);
  form.appendChild(footer);

  // Assemble card
  card.appendChild(form);
  card.appendChild(authError);

  // Setup event listeners
  createLink.addEventListener('click', (e) => {
    e.preventDefault();
    callbacks.onRegisterClick();
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    showLoading(authError, 'Signing in...');

    const email = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) {
      showError(authError, 'Enter email and password.');
      return;
    }

    try {
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const body = await res.json().catch(() => null);
      if (res.ok) {
        console.log('Login successful:', body);
        // Check if 2FA is required
        if (body?.tfaRequired) {
          localStorage.setItem('tfaEnabled', 'true');
          localStorage.setItem('userId', body.userId);
          if (body?.user) {
            localStorage.setItem('user', JSON.stringify(body.user));
          }
          // Trigger render2FA through parent component
          const event = new CustomEvent('login:tfa-required', { detail: body });
          window.dispatchEvent(event);
        } else {
          if (body?.user?.id) {
            localStorage.setItem('userId', body.user?.id);
            localStorage.setItem('user', JSON.stringify(body.user));
          }
          localStorage.setItem('tfaEnabled', 'false');
          showSuccess(authError, 'Login successful.');
          const { navigate } = await import('../../spa');
          setTimeout(() => { navigate('/'); }, 600);
        }
      } else {
        showError(authError, (body && (body.message || body.error)) || `Login failed (${res.status})`);
      }
    } catch (err) {
      showError(authError, (err as Error).message || 'Network error');
    }
  });

  return { form, card };
}
