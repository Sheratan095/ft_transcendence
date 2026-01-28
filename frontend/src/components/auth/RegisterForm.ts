import { createFormInput } from '../shared/FormInput';
import { createCard } from '../shared/Card';
import { createButton } from '../shared/Button';
import { createErrorContainer, showError, showSuccess, showLoading } from '../shared/ErrorMessage';

export interface RegisterFormCallbacks {
  onLoginClick: () => void;
}

export function createRegisterForm(callbacks: RegisterFormCallbacks): { form: HTMLFormElement; card: HTMLDivElement } {
  const card = createCard({ shadowColor: '#00ffff' });
  const form = document.createElement('form');
  form.id = 'register-form';
  form.noValidate = true;
  form.className = 'w-full max-w-2xl space-y-4';

  // Title
  const title = document.createElement('h1');
  title.className = 'text-3xl font-bold text-left mb-2 text-white';
  title.textContent = 'Register';

  // Description
  const desc = document.createElement('p');
  desc.className = 'text-xl text-neutral-400 mb-4 text-left';
  desc.textContent = 'Create a new account below.';

  // Username field
  const { wrapper: userWrap, input: userInput } = createFormInput({
    id: 'username',
    name: 'username',
    label: 'Username',
    placeholder: 'john_doe',
    focusRingColor: '#00ffff'
  });

  // Email field
  const { wrapper: emailWrap, input: emailInput } = createFormInput({
    id: 'email_reg',
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    focusRingColor: '#00ffff'
  });

  // Password field
  const { wrapper: passWrap, input: passInput } = createFormInput({
    id: 'password_reg',
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: '••••••••',
    focusRingColor: '#00ffff'
  });

  // Submit button
  const submit = createButton({
    text: 'Create account',
    color: '#00ffff'
  });

  // Footer with login link
  const footer = document.createElement('div');
  footer.className = 'mt-4 text-xl text-neutral-400 text-center';
  const span = document.createElement('span');
  span.textContent = 'Already have an account? ';
  const loginLink = document.createElement('a');
  loginLink.id = 'to-login';
  loginLink.href = '#';
  loginLink.className = 'text-[#00ffff] hover:underline';
  loginLink.textContent = 'Sign in';
  footer.appendChild(span);
  footer.appendChild(loginLink);

  // Error container
  const authError = createErrorContainer();

  // Assemble form
  form.appendChild(title);
  form.appendChild(desc);
  form.appendChild(userWrap);
  form.appendChild(emailWrap);
  form.appendChild(passWrap);
  form.appendChild(submit);
  form.appendChild(footer);

  // Assemble card
  card.appendChild(form);
  card.appendChild(authError);

  // Setup event listeners
  loginLink.addEventListener('click', (e) => {
    e.preventDefault();
    callbacks.onLoginClick();
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    showLoading(authError, 'Registering...');

    const username = userInput.value.trim();
    const email = emailInput.value.trim();
    const password = passInput.value;

    if (!username || !email || !password) {
      showError(authError, 'Enter username, email and password.');
      return;
    }

    try {
      const res = await fetch(`/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, email, password })
      });

      const body = await res.json().catch(() => null);
      if (res.ok) {
        if (body?.user?.id) localStorage.setItem('userId', body.user.id);
        if (body?.user?.TfaEnabled)
          localStorage.setItem('tfaEnabled', body.user.tfaEnabled);
        else 
          localStorage.setItem('tfaEnabled', 'false');
        showSuccess(authError, 'Registration successful.');
        setTimeout(() => { location.href = '/'; }, 600);
      } else {
        showError(authError, (body && (body.message || body.error)) || `Register failed (${res.status})`);
      }
    } catch (err) {
      showError(authError, (err as Error).message || 'Network error');
    }
  });

  return { form, card };
}
