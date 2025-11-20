import spa from './spa';


class AuthUI {
private container: HTMLElement;


constructor() {
const el = document.getElementById("auth-container");
if (!el) throw new Error("Auth container not found");
this.container = el;


this.renderLogin();
}


private renderLogin() {
  this.container.innerHTML = `
  <div class="rounded-xl border border-neutral-700 bg-neutral-900 shadow-[10px_10px_0_0_#0dff66] transition-all duration-[0.4s] hover:shadow-lg p-8">
    <form id="login-form" class="w-full space-y-4" novalidate>
      <h1 class="text-2xl font-bold text-center mb-2 text-white">Log in</h1>
      <p class="text-sm text-neutral-400 mb-4 text-center">Welcome back — enter your credentials.</p>

      <div>
        <label for="email" class="text-xl text-neutral-300 uppercase font-semibold block mb-1">Email</label>
        <input id="email" name="email" type="email" required placeholder="you@example.com"
          class="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#0dff66]" />
      </div>

      <div>
        <label for="password" class="text-xl text-neutral-300 uppercase font-semibold block mb-1">Password</label>
        <input id="password" name="password" type="password" required placeholder="••••••••"
          class="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#0dff66]" />
      </div>

      <button type="submit" class="mt-6 w-full bg-[#0dff66] text-black font-semibold py-2 rounded-md hover:brightness-90 hover:scale-[1.02] transition">Sign in</button>

      <div class="mt-4 text-xl text-neutral-400 text-center">
        <span>Don't have an account? </span>
        <a id="to-register" href="#" class="text-[#0dff66] hover:underline">Create one</a>
      </div>
    </form>
    <div id="auth-error" class="text-red-400 text-sm text-center hidden"></div>
  </div>
  `;

document.getElementById("to-register")?.addEventListener("click", (e) => {
    e.preventDefault();
    this.renderRegister();
  });

  // Attach submit handler for login
  const form = document.getElementById('login-form') as HTMLFormElement | null;
  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = (document.getElementById('email') as HTMLInputElement)?.value?.trim() || '';
    const password = (document.getElementById('password') as HTMLInputElement)?.value || '';
    const resultEl = document.getElementById('auth-error') as HTMLDivElement;
    resultEl.className = 'text-xl mt-2 text-center';
    form.appendChild(resultEl);

    if (!email || !password) {
      resultEl.textContent = 'Enter email and password.';
      resultEl.classList.add('text-red-600');
      return;
    }

    try {
      resultEl.textContent = 'Signing in...';
      const res = await fetch(`http://localhost:3000/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
 
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      console.log('login response', res);

      const body = await res.json().catch(() => null);
      if (res.ok) {
        if (body?.user?.id) localStorage.setItem('userId', body.user.id);
        resultEl.textContent = 'Login successful.';
        resultEl.className = 'text-xl mt-2 text-center text-green-600';
        setTimeout(() => { location.href = '/'; }, 600);
      } else {
        resultEl.textContent = (body && (body.message || body.error)) || `Login failed (${res.status})`;
        resultEl.className = 'text-xl mt-2 text-center text-red-600';
      }
    } catch (err) {
      resultEl.textContent = (err as Error).message || 'Network error';
      resultEl.className = 'text-xl mt-2 text-center text-red-600';
    }
  });
}


private renderRegister() {
  this.container.innerHTML = `
  <div class="rounded-xl border border-neutral-700 bg-neutral-900 shadow-[10px_10px_0_0_#0dff66] transition-all duration-[0.4s] hover:shadow-lg p-8">
    <form id="register-form" class="w-full space-y-4" novalidate>
      <h1 class="text-2xl font-bold text-center mb-2 text-white">Register</h1>
      <p class="text-xl text-neutral-400 mb-4 text-center">Create a new account below.</p>

      <div>
        <label for="username" class="text-xl text-neutral-300 uppercase font-semibold block mb-1">Username</label>
        <input id="username" name="username" required placeholder="john_doe"
          class="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#0dff66]" />
      </div>

      <div>
        <label for="email_reg" class="text-xl text-neutral-300 uppercase font-semibold block mb-1">Email</label>
        <input id="email_reg" name="email" type="email" required placeholder="you@example.com"
          class="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#0dff66]" />
      </div>

      <div>
        <label for="password_reg" class="text-xl text-neutral-300 uppercase font-semibold block mb-1">Password</label>
        <input id="password_reg" name="password" type="password" required placeholder="••••••••"
          class="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#0dff66]" />
      </div>

      <button type="submit" class="mt-6 w-full bg-[#0dff66] text-black font-semibold py-2 rounded-md hover:brightness-90 hover:scale-[1.02] transition">Create account</button>

      <div class="mt-4 text-xl text-neutral-400 text-center">
        <span>Already have an account? </span>
        <a id="to-login" href="#" class="text-[#0dff66] hover:underline">Sign in</a>
      </div>
    </form>
    <div id="auth-error" class="text-red-400 text-sm text-center hidden"></div>
  </div>
  `;

document.getElementById("to-login")?.addEventListener("click", (e) => {
e.preventDefault();
this.renderLogin();
});
    
    // attach register submit handler
    // (Note: renderRegister sets the DOM and this code will run when someone navigates to the register view again)
    // We add a delegated listener to the container so the handler works after renderRegister replaces innerHTML
    this.container.addEventListener('submit', async (ev) => {
      const target = ev.target as HTMLFormElement | null;
      if (!target) return;
      if (target.id !== 'register-form') return;
      ev.preventDefault();
  
      const username = (document.getElementById('username') as HTMLInputElement)?.value?.trim() || '';
      const email = (document.getElementById('email_reg') as HTMLInputElement)?.value?.trim() || '';
      const password = (document.getElementById('password_reg') as HTMLInputElement)?.value || '';
  
      const resultEl = document.getElementById('auth-error') as HTMLDivElement;
      resultEl.className = 'text-xl mt-2 text-center';
      target.appendChild(resultEl);
  
      if (!username || !email || !password) {
        resultEl.textContent = 'Enter username, email and password.';
        resultEl.className = 'text-xl mt-2 text-center text-red-600';
        return;
      }
  
      try {
        resultEl.textContent = 'Registering...';
        const res = await fetch(`http://localhost:3000/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
   
          credentials: 'include',
          body: JSON.stringify({ username, email, password })
        });
        
        const body = await res.json().catch(() => null);
        if (res.ok) {
          if (body?.user?.id) localStorage.setItem('userId', body.user.id);
          resultEl.textContent = 'Registration successful.';
          resultEl.className = 'text-xl mt-2 text-center text-green-600';
          setTimeout(() => { location.href = '/'; }, 600);
        } else {
          resultEl.textContent = (body && (body.message || body.error)) || `Register failed (${res.status})`;
          resultEl.className = 'text-xl mt-2 text-center text-red-600';
        }
      } catch (err) {
        resultEl.textContent = (err as Error).message || 'Network error';
        resultEl.className = 'text-xl mt-2 text-center text-red-600';
      }
    });
}}

document.addEventListener('DOMContentLoaded', async () => {
  new AuthUI();

  //await spa.start();
});


export default {};