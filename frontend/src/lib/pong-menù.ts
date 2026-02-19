import { showErrorToast, showSuccessToast } from '../components/shared/Toast';
import { openPongModal } from './pong-ui';
import { getUserId } from './auth';

export type PongModeType = 'online' | 'offline-1v1' | 'offline-ai';

let selectedMode: PongModeType | null = null;
let modeSelectionCallback: ((mode: PongModeType) => Promise<void>) | null = null;

export function openPongModeModal(onModeSelected?: (mode: PongModeType) => Promise<void>) {
  const modeModal = document.getElementById('pong-mode-modal');
  if (!modeModal) {
    console.error('Pong mode modal not found');
    return;
  }

  modeSelectionCallback = onModeSelected || null;
  modeModal.classList.remove('hidden');
  setupModeSelectionListeners();
}

export function closePongModeModal() {
  const modeModal = document.getElementById('pong-mode-modal');
  if (modeModal) modeModal.classList.add('hidden');
}

function setupModeSelectionListeners() {
  const onlineBtn = document.getElementById('pong-mode-online');
  const offline1v1Btn = document.getElementById('pong-mode-offline-1v1');
  const offlineAiBtn = document.getElementById('pong-mode-offline-ai');
  const closeBtn = document.getElementById('pong-mode-close-btn');

  if (onlineBtn) {
    const newBtn = onlineBtn.cloneNode(true) as HTMLButtonElement;
    onlineBtn.replaceWith(newBtn);
  }
  if (offline1v1Btn) {
    const newBtn = offline1v1Btn.cloneNode(true) as HTMLButtonElement;
    offline1v1Btn.replaceWith(newBtn);
  }
  if (offlineAiBtn) {
    const newBtn = offlineAiBtn.cloneNode(true) as HTMLButtonElement;
    offlineAiBtn.replaceWith(newBtn);
  }
  if (closeBtn) {
    const newBtn = closeBtn.cloneNode(true) as HTMLButtonElement;
    closeBtn.replaceWith(newBtn);
  }

  const freshOnline = document.getElementById('pong-mode-online') as HTMLButtonElement | null;
  const freshOffline1v1 = document.getElementById('pong-mode-offline-1v1') as HTMLButtonElement | null;
  const freshOfflineAi = document.getElementById('pong-mode-offline-ai') as HTMLButtonElement | null;
  const freshClose = document.getElementById('pong-mode-close-btn') as HTMLButtonElement | null;

  if (freshOnline) freshOnline.addEventListener('click', () => selectMode('online'));
  if (freshOffline1v1) freshOffline1v1.addEventListener('click', () => selectMode('offline-1v1'));
  if (freshOfflineAi) freshOfflineAi.addEventListener('click', () => selectMode('offline-ai'));
  if (freshClose) freshClose.addEventListener('click', closePongModeModal);

  const modeModal = document.getElementById('pong-mode-modal');
  if (modeModal) {
    modeModal.addEventListener('click', (e) => {
      if (e.target === modeModal) closePongModeModal();
    });
  }
}

async function selectMode(mode: PongModeType) {
  selectedMode = mode;
  closePongModeModal();

  try {
    if (modeSelectionCallback) {
      await modeSelectionCallback(mode);
    } else {
      await handleModeSelection(mode);
    }
  } catch (err) {
    console.error('Error selecting pong mode:', err);
    showErrorToast('Failed to start Pong mode');
  }
}

async function handleModeSelection(mode: PongModeType) {
  const names: Record<PongModeType, string> = {
    'online': 'Online Matchmaking',
    'offline-1v1': 'Offline 1v1',
    'offline-ai': 'Offline vs Bot'
  };

  showSuccessToast(`Selected: ${names[mode]}`);

  // Ensure user is logged in for online
  if (mode === 'online') {
    const uid = getUserId();
    if (!uid) {
      showErrorToast('You must be logged in for online mode');
      return;
    }
  }

  await openPongModal();
}

export function getSelectedPongMode(): PongModeType | null { return selectedMode; }

export default { openPongModeModal, closePongModeModal, getSelectedPongMode };
