import { logout, deleteAccout } from '../../lib/auth';
import { openChatModal } from '../../lib/chat';
import type { User } from '../../lib/auth';

export async function renderProfileCard(user: User, root: HTMLElement): Promise<HTMLElement | null> {
  // Clone template
  const template = document.getElementById('profile-card-template') as HTMLTemplateElement;
  if (!template) {
    console.error('Profile card template not found');
    return null;
  }

  const card = template.content.cloneNode(true) as DocumentFragment;
  const cardEl = (card.querySelector('div') as HTMLElement) || null;

  if (!cardEl) return null;

  // ===== Avatar =====
  const avatar = card.querySelector('#profile-avatar') as HTMLImageElement;
  if (avatar) {
    if (user.avatarUrl) {
      avatar.src = user.avatarUrl.startsWith('http') ? user.avatarUrl : `/api${user.avatarUrl}`;
    } else {
      avatar.src = '/assets/placeholder-avatar.jpg';
    }
  }

  // Avatar upload handler
  const avatarInput = card.querySelector('#input-avatar') as HTMLInputElement;
  if (avatarInput) {
    avatarInput.addEventListener('change', async () => {
      const file = avatarInput.files ? avatarInput.files[0] : null;
      if (!file) return;
      
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`/api/users/upload-avatar`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!res.ok) throw new Error(`Avatar upload failed: ${res.status}`);
        const body = await res.json();
        if (body && body.avatarUrl) {
          avatar.src = body.avatarUrl.startsWith('http') ? body.avatarUrl : `/api${body.avatarUrl}`;
          user.avatarUrl = body.avatarUrl;
        }
      } catch (err) {
        console.error('Avatar upload error:', err);
      }
    });
  }

  // ===== Username =====
  const username = card.querySelector('#profile-username') as HTMLElement;
  if (username) {
    username.textContent = user.username || user.email || 'User';
  }

  // ===== 2FA Toggle =====
  const enabled2FA = card.querySelector('#profile-tfa') as HTMLElement;
  const input2FA = card.querySelector('#input-lock') as HTMLInputElement;

  input2FA.checked = user.tfaEnabled || false;
  if (enabled2FA) {
    enabled2FA.textContent = user.tfaEnabled ? 'DISABLE 2FA' : 'ENABLE 2FA';
  }

  if (input2FA) {
    input2FA.addEventListener('change', async () => {
      const tfaEnabled = input2FA.checked;
      try {
        const res = await fetch(`/api/auth/enable-2fa`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tfaEnabled }),
        });
        if (!res.ok) throw new Error(`2FA update failed: ${res.status}`);
        user.tfaEnabled = tfaEnabled;
        localStorage.setItem('tfaEnabled', tfaEnabled ? 'true' : 'false');
        if (enabled2FA) {
          enabled2FA.textContent = tfaEnabled ? 'DISABLE 2FA' : 'ENABLE 2FA';
        }
      } catch (err) {
        console.error('2FA update error:', err);
        input2FA.checked = !tfaEnabled;
      }
    });
  }

  // ===== Email & ID =====
  const email = card.querySelector('#profile-email') as HTMLElement;
  if (email) email.textContent = user.email || '';

  const id = card.querySelector('#profile-id') as HTMLElement;
  if (id) id.textContent = user.id || '';

  // ===== Buttons =====
  const logoutBtn = card.querySelector('#profile-logout-btn') as HTMLButtonElement;
  const chatBtn = card.querySelector('#profile-chat-btn') as HTMLButtonElement;

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logout();
      window.location.reload();
    });
  }

  if (chatBtn) {
    chatBtn.addEventListener('click', () => {
      openChatModal();
    });
  }

  // ===== Delete Account Button =====
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      try {
        await deleteAccout();
        localStorage.removeItem('userId');
        localStorage.removeItem('tfaEnabled');
        window.location.reload();
      } catch (err) {
        console.error('Delete account error:', err);
        alert('Failed to delete account');
      }
    });
  }

  // Append to root
  root.appendChild(card);

  return cardEl;
}
