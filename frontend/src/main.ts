import { getUserId, type User } from './lib/auth';
import { startTokenRefresh } from './lib/token';
import { renderProfile } from './lib/profile';


class AuthUI {
  private container: HTMLElement;

  constructor() {
    const el = document.getElementById('auth-container');
    if (!el) throw new Error('Auth container not found');
    this.container = el;

    // make container flexible so the card can expand to available space
    this.container.classList.add('w-full', 'flex', 'items-center', 'justify-center');
    this.container.style.minHeight = '240px';

    getUserCount();
    if (getUserId()) {
        startTokenRefresh();
        renderProfile(el);
      return;
    }
    else
    {
      this.renderLogin();
    }
  }

  private clear() {
    while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
  }

  private renderLogin() {
    this.clear();

    const card = document.createElement('div');
    card.className = 'rounded-xl border border-neutral-700 bg-neutral-900/50 shadow-[10px_10px_0_0_#0dff66] transition-all duration-[0.4s] hover:shadow-lg p-8 w-full flex items-start justify-start flex-col justify-between';

    const form = document.createElement('form');
    form.id = 'login-form';
    form.noValidate = true;
    form.className = 'w-full max-w-2xl space-y-4';

    const title = document.createElement('h1');
    title.className = 'text-3xl font-bold text-left mb-2 text-white';
    title.textContent = 'Log in';

    const desc = document.createElement('p');
    desc.className = 'text-xl text-neutral-400 mb-4 text-left';
    desc.textContent = 'Welcome back — enter your credentials.';

    // email
    const emailWrap = document.createElement('div');
    const emailLabel = document.createElement('label');
    emailLabel.htmlFor = 'email';
    emailLabel.className = 'text-xl text-neutral-300 uppercase font-semibold block mb-1';
    emailLabel.textContent = 'Email';
    const emailInput = document.createElement('input');
    emailInput.id = 'email';
    emailInput.name = 'email';
    emailInput.type = 'email';
    emailInput.required = true;
    emailInput.placeholder = 'you@example.com';
    emailInput.className = 'w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#0dff66]';
    emailWrap.appendChild(emailLabel);
    emailWrap.appendChild(emailInput);

    // password
    const passWrap = document.createElement('div');
    const passLabel = document.createElement('label');
    passLabel.htmlFor = 'password';
    passLabel.className = 'text-xl text-neutral-300 uppercase font-semibold block mb-1';
    passLabel.textContent = 'Password';
    const passInput = document.createElement('input');
    passInput.id = 'password';
    passInput.name = 'password';
    passInput.type = 'password';
    passInput.required = true;
    passInput.placeholder = '••••••••';
    passInput.className = 'w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#0dff66]';
    passWrap.appendChild(passLabel);
    passWrap.appendChild(passInput);

    // submit
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'mt-6 w-full bg-[#0dff66] text-black font-semibold py-2 rounded-md hover:brightness-90 hover:scale-[1.02] transition';
    submit.textContent = 'Sign in';

    // footer link
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

    const authError = document.createElement('div');
    authError.id = 'auth-error';
    authError.className = 'text-red-400 text-sm text-center align-end hidden mt-4 min-h-[1.5rem] w-full';

    form.appendChild(title);
    form.appendChild(desc);
    form.appendChild(emailWrap);
    form.appendChild(passWrap);
    form.appendChild(submit);
    form.appendChild(footer);

    card.appendChild(form);
    card.appendChild(authError);
    this.container.appendChild(card);

    createLink.addEventListener('click', (e) => { e.preventDefault(); this.renderRegister(); });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      authError.classList.remove('hidden');
      authError.className = 'text-xl mt-2 text-center';
      const email = emailInput.value.trim();
      const password = passInput.value;

      if (!email || !password) {
        authError.textContent = 'Enter email and password.';
        authError.classList.add('text-red-600');
        return;
      }

      try {
        authError.textContent = 'Signing in...';
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
            authError.textContent = '';
            this.render2FA();
          } else {
            if (body?.user?.id) localStorage.setItem('userId', body.user?.id);
            localStorage.setItem('tfaEnabled', 'false');
            authError.textContent = 'Login successful.';
            authError.className = 'text-xl mt-2 text-center text-green-600';
            setTimeout(() => { location.href = '/'; }, 600);
          }
        } else {
          authError.textContent = (body && (body.message || body.error)) || `Login failed (${res.status})`;
          authError.className = 'text-xl mt-2 text-center text-red-600';
        }
      } catch (err) {
        authError.textContent = (err as Error).message || 'Network error';
        authError.className = 'text-xl mt-2 text-center text-red-600';
      }
    });
  }

  private renderRegister() {
    this.clear();

    const card = document.createElement('div');
    card.className = 'rounded-xl border border-neutral-700 bg-neutral-900/50 shadow-[10px_10px_0_0_#00ffff] transition-all duration-[0.4s] hover:shadow-lg p-8 w-full h-full flex items-start justify-start flex flex-col justify-between';

    const form = document.createElement('form');
    form.id = 'register-form';
    form.noValidate = true;
    form.className = 'w-full max-w-2xl space-y-4';

    const title = document.createElement('h1');
    title.className = 'text-3xl font-bold text-left mb-2 text-white';
    title.textContent = 'Register';

    const desc = document.createElement('p');
    desc.className = 'text-xl text-neutral-400 mb-4 text-left';
    desc.textContent = 'Create a new account below.';

    const userWrap = document.createElement('div');
    const userLabel = document.createElement('label');
    userLabel.htmlFor = 'username';
    userLabel.className = 'text-xl text-neutral-300 uppercase font-semibold block mb-1';
    userLabel.textContent = 'Username';
    const userInput = document.createElement('input');
    userInput.id = 'username';
    userInput.name = 'username';
    userInput.required = true;
    userInput.placeholder = 'john_doe';
    userInput.className = 'w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#00ffff]';
    userWrap.appendChild(userLabel);
    userWrap.appendChild(userInput);

    const emailWrap = document.createElement('div');
    const emailLabel = document.createElement('label');
    emailLabel.htmlFor = 'email_reg';
    emailLabel.className = 'text-xl text-neutral-300 uppercase font-semibold block mb-1';
    emailLabel.textContent = 'Email';
    const emailInput = document.createElement('input');
    emailInput.id = 'email_reg';
    emailInput.name = 'email';
    emailInput.type = 'email';
    emailInput.required = true;
    emailInput.placeholder = 'you@example.com';
    emailInput.className = 'w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#00ffff]';
    emailWrap.appendChild(emailLabel);
    emailWrap.appendChild(emailInput);

    const passWrap = document.createElement('div');
    const passLabel = document.createElement('label');
    passLabel.htmlFor = 'password_reg';
    passLabel.className = 'text-xl text-neutral-300 uppercase font-semibold block mb-1';
    passLabel.textContent = 'Password';
    const passInput = document.createElement('input');
    passInput.id = 'password_reg';
    passInput.name = 'password';
    passInput.type = 'password';
    passInput.required = true;
    passInput.placeholder = '••••••••';
    passInput.className = 'w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#00ffff]';
    passWrap.appendChild(passLabel);
    passWrap.appendChild(passInput);

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'mt-6 w-full bg-[#00ffff] text-black font-semibold py-2 rounded-md hover:brightness-90 hover:scale-[1.02] transition';
    submit.textContent = 'Create account';

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

    const authError = document.createElement('div');
    authError.id = 'auth-error';
    authError.className = 'text-red-400 text-sm text-center align-center hidden mt-4 min-h-[1.5rem] w-full';

    form.appendChild(title);
    form.appendChild(desc);
    form.appendChild(userWrap);
    form.appendChild(emailWrap);
    form.appendChild(passWrap);
    form.appendChild(submit);
    form.appendChild(footer);

    card.appendChild(form);
    card.appendChild(authError);
    this.container.appendChild(card);

    loginLink.addEventListener('click', (e) => { e.preventDefault(); this.renderLogin(); });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      authError.classList.remove('hidden');
      authError.className = 'text-xl mt-2 text-center';

      const username = userInput.value.trim();
      const email = emailInput.value.trim();
      const password = passInput.value;

      if (!username || !email || !password) {
        authError.textContent = 'Enter username, email and password.';
        authError.classList.add('text-red-600');
        return;
      }

      try {
        authError.textContent = 'Registering...';
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
          authError.textContent = 'Registration successful.';
          authError.className = 'text-xl mt-2 text-center text-green-600';
          setTimeout(() => { location.href = '/'; }, 600);
        } else {
          authError.textContent = (body && (body.message || body.error)) || `Register failed (${res.status})`;
          authError.className = 'text-xl mt-2 text-center text-red-600';
        }
      } catch (err) {
        authError.textContent = (err as Error).message || 'Network error';
        authError.className = 'text-xl mt-2 text-center text-red-600';
      }
    });
  }

  // 2FA 

  private render2FA() {
    this.clear();

    const card = document.createElement('div');
    card.className = 'rounded-xl border border-neutral-700 bg-neutral-900/50 shadow-[10px_10px_0_0_#0dff66] transition-all duration-[0.4s] hover:shadow-lg p-8 w-full flex items-start justify-start flex-col justify-between';

    const form = document.createElement('form');
    form.id = '2fa-form';
    form.noValidate = true;
    form.className = 'w-full max-w-2xl space-y-4';

    const title = document.createElement('h1');
    title.className = 'text-3xl font-bold text-left mb-2 text-white';
    title.textContent = 'Two-Factor Authentication';

    const desc = document.createElement('p');
    desc.className = 'text-xl text-neutral-400 mb-4 text-left';
    desc.textContent = 'Enter the 6-digit code sent to your email.';

    // OTP code input
    const otpWrap = document.createElement('div');
    const otpLabel = document.createElement('label');
    otpLabel.htmlFor = 'otp-code';
    otpLabel.className = 'text-xl text-neutral-300 uppercase font-semibold block mb-1';
    otpLabel.textContent = '2FA Code';
    const otpInput = document.createElement('input');
    otpInput.id = 'otp-code';
    otpInput.name = 'otpCode';
    otpInput.type = 'text';
    otpInput.inputMode = 'numeric';
    otpInput.maxLength = 6;
    otpInput.required = true;
    otpInput.placeholder = '000000';
    otpInput.className = 'w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#0dff66] text-center text-2xl tracking-widest';
    otpWrap.appendChild(otpLabel);
    otpWrap.appendChild(otpInput);

    // submit
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'mt-6 w-full bg-[#0dff66] text-black font-semibold py-2 rounded-md hover:brightness-90 hover:scale-[1.02] transition';
    submit.textContent = 'Verify';

    // back link
    const footer = document.createElement('div');
    footer.className = 'mt-4 text-xl text-neutral-400 text-center';
    const backLink = document.createElement('a');
    backLink.id = 'back-to-login';
    backLink.href = '#';
    backLink.className = 'text-[#0dff66] hover:underline';
    backLink.textContent = 'Back to login';
    footer.appendChild(backLink);

    const authError = document.createElement('div');
    authError.id = 'auth-error';
    authError.className = 'text-red-400 text-sm text-center align-end hidden mt-4 min-h-[1.5rem] w-full';

    form.appendChild(title);
    form.appendChild(desc);
    form.appendChild(otpWrap);
    form.appendChild(submit);
    form.appendChild(footer);

    card.appendChild(form);
    card.appendChild(authError);
    this.container.appendChild(card);

    backLink.addEventListener('click', (e) => { e.preventDefault(); this.renderLogin(); });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      authError.classList.remove('hidden');
      authError.className = 'text-xl mt-2 text-center';
      const otpCode = otpInput.value.trim();

      if (!otpCode || otpCode.length !== 6) {
        authError.textContent = 'Enter a 6-digit code.';
        authError.classList.add('text-red-600');
        return;
      }

      const userId = localStorage.getItem('userId');
      if (!userId) {
        authError.textContent = 'TFA failed.';
        authError.classList.add('text-red-600');
        return;
      }

      try {
        authError.textContent = 'Verifying...';
        const res = await fetch(`/api/auth/2fa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId, otpCode })
        });

        const body = await res.json().catch(() => null);
        if (res.ok) {
          console.log('2FA verification successful:', body);
          authError.textContent = '2FA verified successfully!';
          authError.className = 'text-xl mt-2 text-center text-green-600';
          setTimeout(() => { location.href = '/'; }, 600);
        } else {
          authError.textContent = (body && (body.message || body.error)) || `Verification failed (${res.status})`;
          authError.className = 'text-xl mt-2 text-center text-red-600';
        }
      } catch (err) {
        authError.textContent = (err as Error).message || 'Network error';
        authError.className = 'text-xl mt-2 text-center text-red-600';
      }
    });
  }
}

async function getUserCount() 
{
  const onlineCount = document.getElementById('online-count');
  if (!onlineCount) return;

  try {
    const res = await fetch(`/api/users/stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });
    if (res.ok) {
      const body = await res.json();
      if (body && typeof body.activeUsers === 'number') {
        onlineCount.textContent = 'Join now! (' + body.activeUsers + '/' + body.totalUsers + ') users online.';
      }
    }
  }
    catch (err) {
      console.error('Failed to fetch user stats', err);
    }
}


document.addEventListener('DOMContentLoaded', async () => {
  new AuthUI();
});

export default {};