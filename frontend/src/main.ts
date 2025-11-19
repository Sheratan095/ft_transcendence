import spa from './spa';
import { Header } from './components/Header';


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
<form id="login-form" class="w-full space-y-4" novalidate>
<h1 class="text-2xl font-bold text-center mb-2 text-white">Log in</h1>
<p class="text-sm text-neutral-400 mb-4 text-center">Welcome back — enter your credentials.</p>


<div>
<label for="email" class="text-xs text-neutral-300 uppercase font-semibold block mb-1">Email</label>
<input id="email" name="email" type="email" required placeholder="you@example.com"
class="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#00fff2]" />
</div>


<div>
<label for="password" class="text-xs text-neutral-300 uppercase font-semibold block mb-1">Password</label>
<input id="password" name="password" type="password" required placeholder="••••••••"
class="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#00fff2]" />
</div>


<div class="flex items-center justify-between mt-1">
<label class="inline-flex items-center gap-2 text-sm text-neutral-400">
<input type="checkbox" name="remember" class="h-4 w-4 rounded border-neutral-600 bg-neutral-800 focus:ring-[#00fff2]" />
Remember me
</label>
<a href="#" class="text-sm text-[#00fff2] hover:underline">Forgot?</a>
</div>


<button type="submit" class="mt-6 w-full bg-[#00fff2] text-black font-semibold py-2 rounded-md hover:brightness-90 hover:scale-[1.02] transition">Sign in</button>


<div class="mt-4 text-xs text-neutral-400 text-center">
<span>Don't have an account? </span>
<a id="to-register" href="#" class="text-[#00fff2] hover:underline">Create one</a>
</div>
</form>
`;


document.getElementById("to-register")?.addEventListener("click", (e) => {
e.preventDefault();
this.renderRegister();
});
}


private renderRegister() {
this.container.innerHTML = `
<form id="register-form" class="w-full space-y-4" novalidate>
<h1 class="text-2xl font-bold text-center mb-2 text-white">Register</h1>
<p class="text-sm text-neutral-400 mb-4 text-center">Create a new account below.</p>


<div>
<label for="username" class="text-xs text-neutral-300 uppercase font-semibold block mb-1">Username</label>
<input id="username" name="username" required placeholder="john_doe"
class="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#00fff2]" />
</div>


<div>
<label for="email_reg" class="text-xs text-neutral-300 uppercase font-semibold block mb-1">Email</label>
<input id="email_reg" name="email" type="email" required placeholder="you@example.com"
class="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#00fff2]" />
</div>


<div>
<label for="password_reg" class="text-xs text-neutral-300 uppercase font-semibold block mb-1">Password</label>
<input id="password_reg" name="password" type="password" required placeholder="••••••••"
class="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#00fff2]" />
</div>


<button type="submit" class="mt-6 w-full bg-[#00fff2] text-black font-semibold py-2 rounded-md hover:brightness-90 hover:scale-[1.02] transition">Create account</button>


<div class="mt-4 text-xs text-neutral-400 text-center">
<span>Already have an account? </span>
<a id="to-login" href="#" class="text-[#00fff2] hover:underline">Sign in</a>
</div>
</form>
`;


document.getElementById("to-login")?.addEventListener("click", (e) => {
e.preventDefault();
this.renderLogin();
});
}}

document.addEventListener('DOMContentLoaded', async () => {
  new Header();
  new AuthUI();

  //await spa.start();
});


export default {};