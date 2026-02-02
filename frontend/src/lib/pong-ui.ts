import { showErrorToast } from '../components/shared/Toast';


/**
 * Open the pong modal (or navigate to pong game)
 */
export async function openPongModal() {
  // For now, navigate to pong page or open pong modal
  // This can be extended with full pong game logic similar to tris-ui.ts
  try {
    // Navigate to pong game page
    const { navigate } = await import('../spa');
    navigate('/pong');
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

/**
 * Setup pong card click listener for routing
 */
export function setupPongCardListener() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attachPongCardListener();
    });
  } else {
    attachPongCardListener();
  }
}

function attachPongCardListener() {
  const pongCard = document.getElementById('pong-card-btn');
  if (!pongCard) {
    console.error('Pong card button not found');
    return;
  }
  console.log('Attaching pong card listener');
  pongCard.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('Pong card clicked - navigating to /pong');
    const { navigate } = await import('../spa');
    navigate('/pong');
  });
}
