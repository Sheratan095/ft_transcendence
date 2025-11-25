const API_BASE = import.meta.env.VITE_API_BASE || 'https://localhost:3000';

export interface User {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
}

export function getUserId(): string | null {
  return localStorage.getItem('userId');
}

export async function fetchUserProfile(): Promise<User | null> {
  let userId: string | null = getUserId();
  if (!userId) {
    console.error('No user id available to fetch profile');
    return null;
  }
  console.log('Fetching profile for user id:', userId);

  try {
    const url = `${API_BASE}/users/user?id=${userId}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('Profile fetch failed', response.status);
      return null;
    }

    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

export async function renderProfile(container?: HTMLElement | string): Promise<HTMLElement | null> {
  let root: HTMLElement | null = null;
  if (!container) {
    root = document.getElementById('app') || document.getElementById('auth-container') || null;
  } else if (typeof container === 'string') {
    root = document.getElementById(container) || null;
  } else {
    root = container;
  }

  if (!root) {
    console.warn('renderProfile: target container not found');
    return null;
  }
  root.innerHTML = '';
  const loading = document.createElement('div');
  loading.className = 'py-8 text-center text-neutral-400';
  loading.textContent = 'Loading profile...';
  root.appendChild(loading);

  const user = await fetchUserProfile();
  console.log('Fetched user profile:', user);
  root.removeChild(loading);

  if (!user) {
    localStorage.removeItem('userId');
    location.reload();
    return null;
  }
  const card = document.createElement('div');
  card.className =
    "text-card-foreground flex flex-col gap-6 rounded-xl py-6 transition-all duration-300 " +
    "hover:shadow-md h-full bg-neutral-900/50 border border-neutral-800 shadow-lg w-full max-w-2xl mx-auto";
  const header = document.createElement('div');
  header.className =
    "flex items-start gap-4 px-6 pb-4"; // switched to flex layout

  // LEFT — avatar (smaller + floated)
  const avatarWrap = document.createElement('div');
  avatarWrap.className =
    "relative w-14 h-14 rounded-xl overflow-hidden border border-neutral-700 flex items-center justify-center shrink-0";

  const avatar = document.createElement('img');
  avatar.alt = user.username || "avatar";
  avatar.className = "w-6 h-6 object-cover";
  avatar.src = user.avatarUrl || "/assets/placeholder-avatar.jpg";

  avatarWrap.appendChild(avatar);

  // RIGHT — title + additional content
  const headerRight = document.createElement('div');
  headerRight.className = "flex flex-col justify-center";

  const titleWrap = document.createElement('div');
  titleWrap.className = "text-xl font-bold capitalize";

  const title = document.createElement('h1');
  title.textContent = user.username || user.email || "User";

  titleWrap.appendChild(title);

  headerRight.appendChild(titleWrap);

  header.appendChild(avatarWrap);
  header.appendChild(headerRight);


  const content = document.createElement('div');
  content.className = "px-6";

  const contentWrapper = document.createElement('div');
  contentWrapper.className = "space-y-4";

  const infoGroup = document.createElement('div');
  infoGroup.className = "space-y-2";

  const rowEmail = document.createElement('div');
  rowEmail.className = "flex items-center gap-2";
  rowEmail.innerHTML = `<p class="text-sm"><span class="font-medium">Email:</span> ${user.email}</p>`;

  const rowId = document.createElement('div');
  rowId.className = "flex items-center gap-2";
  rowId.innerHTML = `<p class="text-sm"><span class="font-medium">User ID:</span> ${user.id}</p>`;

  infoGroup.appendChild(rowEmail);
  infoGroup.appendChild(rowId);

  contentWrapper.appendChild(infoGroup);
  const aboutGroup = document.createElement('div');

  const aboutTitle = document.createElement('h3');
  aboutTitle.className =
    "text-sm font-semibold text-neutral-400 mb-2";
  aboutTitle.textContent = "Account info";

  const aboutText = document.createElement('div');
  aboutText.className =
    "text-xs text-neutral-500 space-y-2";
  aboutText.innerHTML = `
    <p>This is your personal profile card.</p>
    <p>Your email and ID are used for account authentication.</p>
  `;

  aboutGroup.appendChild(aboutTitle);
  aboutGroup.appendChild(aboutText);

  contentWrapper.appendChild(aboutGroup);

  content.appendChild(contentWrapper);
  const actions = document.createElement('div');
  actions.className = "w-full flex gap-4 px-6 mt-2";

  const editBtn = document.createElement('button');
  editBtn.className =
    "flex-1 bg-[#0dff66] text-black font-semibold py-2 rounded-md hover:brightness-90 transition";
  editBtn.textContent = "Edit profile";

  const logoutBtn = document.createElement('button');
  logoutBtn.className =
    "flex-1 bg-neutral-800 text-white border border-neutral-700 py-2 rounded-md hover:bg-neutral-700 transition";
  logoutBtn.textContent = "Logout";

  actions.appendChild(editBtn);
  actions.appendChild(logoutBtn);
  card.appendChild(header);
  card.appendChild(content);
  card.appendChild(actions);

  root.appendChild(card);
  logoutBtn.addEventListener('click', async () => {
    localStorage.removeItem('userId');
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'include',
    });
    window.location.reload();
  });

  editBtn.addEventListener('click', () => {
    const ev = new CustomEvent('profile:edit', { detail: user });
    window.dispatchEvent(ev);
  });

  return card;
}
