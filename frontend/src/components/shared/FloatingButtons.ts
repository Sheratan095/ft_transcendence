import { openChatModal } from '../chat/chat';
import { isLoggedInClient } from '../../lib/token';
import { goToRoute } from '../../spa';

/**
 * Ensures the buttons container exists
 */
function getOrCreateButtonsContainer() {
  let container = document.getElementById('floating-buttons-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'floating-buttons-container';
    container.className = `fixed bottom-6 right-6 z-50 flex items-center gap-4`;
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Creates a floating chat button in the bottom-right corner when the user is logged in.
 * The button opens the chat modal by delegating to `openChatModal()` from the chat module.
 */
export function initChatButton() {
  try {
    if (!isLoggedInClient()) return;

    // Avoid duplicating the button
    if (document.getElementById('chat-btn')) return;

    const container = getOrCreateButtonsContainer();

    const btn = document.createElement('button');
    btn.id = 'chat-btn';
    btn.title = 'Open chat';
    btn.setAttribute('aria-label', 'Open chat');
    btn.className = `inline-flex z-30 items-center justify-center w-14 h-14 flex-shrink-0 rounded-full bg-accent-orange dark:bg-accent-green
      shadow-lg hover:shadow-xl transition-all overflow-hidden`;

    btn.innerHTML = `
      <img src="/assets/chat.svg" alt="Chat" class="w-6 h-6 object-contain block invert dark:invert-0" />
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🔘 Chat button clicked');
      try {
        openChatModal();
        console.log('✅ openChatModal() called successfully');
      } catch (err) {
        // Fallback: toggle chat-modal visibility if openChatModal unavailable
        console.error('❌ openChatModal error:', err);
        const modal = document.getElementById('chat-modal');
        if (modal) {
          console.log('Using fallback to show modal');
          modal.classList.remove('hidden');
        }
        console.error('openChatModal error or fallback used:', err);
      }
    });

    container.appendChild(btn);
  } catch (err) {
    console.error('initChatButton error:', err);
  }
}

export function removeHomeChatButton() {
  const el = document.getElementById('chat-btn');
  if (el && el.parentElement) el.parentElement.removeChild(el);
  
  // Remove container if empty
  const container = document.getElementById('floating-buttons-container');
  if (container && container.children.length === 0 && container.parentElement) {
    container.parentElement.removeChild(container);
  }
}

/**
 * Creates a floating home button in the bottom-right corner, next to the chat button.
 * The button is only shown when NOT on the home page (/).
 */
export function initHomeButton() {
  try {
    // Don't show home button on the home page itself
    if (window.location.pathname === '/') return;

    // Avoid duplicating the button
    if (document.getElementById('home-nav-btn')) return;

    const container = getOrCreateButtonsContainer();

    const btn = document.createElement('button');
    btn.id = 'home-nav-btn';
    btn.title = 'Return to home';
    btn.setAttribute('aria-label', 'Return to home');
    btn.className = `inline-flex items-center justify-center w-14 h-14 flex-shrink-0 rounded-full bg-accent-orange dark:bg-accent-green
      shadow-lg hover:shadow-xl transition-all overflow-hidden`;

    btn.innerHTML = `
      <img src="/assets/home.png" alt="Home" class="w-6 h-6 object-contain block invert dark:invert-0" />
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/';
    });

    container.appendChild(btn);
  } catch (err) {
    console.error('initHomeButton error:', err);
  }
}

export function removeHomeButton() {
  const el = document.getElementById('home-nav-btn');
  if (el && el.parentElement) el.parentElement.removeChild(el);
  
  // Remove container if empty
  const container = document.getElementById('floating-buttons-container');
  if (container && container.children.length === 0 && container.parentElement) {
    container.parentElement.removeChild(container);
  }
}
