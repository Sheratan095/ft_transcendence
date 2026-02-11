import { openChatModal } from './chat';
import { isLoggedInClient } from '../../lib/token';

/**
 * Creates a floating chat button in the bottom-right corner when the user is logged in.
 * The button opens the chat modal by delegating to `openChatModal()` from the chat module.
 */
export function initFloatingButton() {
  try {
    if (!isLoggedInClient()) return;

    // Avoid duplicating the button
    if (document.getElementById('home-chat-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'home-chat-btn';
    btn.title = 'Open chat';
    btn.setAttribute('aria-label', 'Open chat');
    btn.className = `fixed bottom-6 right-6 z-50 rounded-full p-6 bg-accent-orange dark:bg-accent-green
      shadow-lg hover:shadow-xl transition-flex flex items-center justify-center`;

    btn.innerHTML = `
      <img src="/assets/chat.svg" alt="Chat" class="w-10 h-10 invert dark:invert-0" />
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        openChatModal();
      } catch (err) {
        // Fallback: toggle chat-modal visibility if openChatModal unavailable
        const modal = document.getElementById('chat-modal');
        if (modal) modal.classList.remove('hidden');
        console.error('openChatModal error or fallback used:', err);
      }
    });

    document.body.appendChild(btn);
  } catch (err) {
    console.error('initHomeChatButton error:', err);
  }
}

export function removeHomeChatButton() {
  const el = document.getElementById('home-chat-btn');
  if (el && el.parentElement) el.parentElement.removeChild(el);
}
