import { showErrorToast } from '../components/shared/Toast';


/**
 * Open the pong modal (or navigate to pong game)
 */
export async function openPongModal() {
  // For now, navigate to pong page or open pong modal
  // This can be extended with full pong game logic similar to tris-ui.ts
  try {
    // Navigate to pong game page
    window.location.href = '/pong';
  } catch (err) {
    console.error('Failed to open pong:', err);
    showErrorToast((err as Error).message || 'Failed to open pong game');
  }
}

/**
 * Close the pong modal
 */
export function closePongModal() {
  // Implement if needed
}
