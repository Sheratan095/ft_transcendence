import { joinTournament, createTournament } from './Tournament';

// ==============================
// Types
// ==============================

interface Tournament {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  creatorUsername: string;
  participantCount: number;
}

interface ApiError {
  statusCode: number;
  code: string;
  error: string;
  message: string;
}

// ==============================
// Static Element
// ==============================

let tournamentList: HTMLElement;

// ==============================
// Load Tournaments (GET)
// ==============================

export async function loadTournaments() {
  tournamentList = document.getElementById("tournament-list") as HTMLElement;

  if (!tournamentList)
    throw new Error("Tournament list element not found");

  try {
    tournamentList.innerHTML = `
      <div class="text-sm text-gray-500 dark:text-neutral-400 py-2">
        Loading tournaments...
      </div>
    `;

    const response = await fetch("/api/pong/get-all-tournaments", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || "Failed to load tournaments");
    }

    const tournaments: Tournament[] = await response.json();
    renderTournaments(tournaments);

  } catch (err) {
    renderError((err as Error).message);
  }
}

// ==============================
// Render Tournaments
// ==============================

function renderTournaments(tournaments: Tournament[]): void {
  tournamentList.innerHTML = "";

  if (tournaments.length === 0) {
    tournamentList.innerHTML = `
      <div class="text-sm text-gray-500 dark:text-neutral-400 py-2">
        No tournaments available.
      </div>
    `;
    return;
  }

  tournaments.forEach((tournament) => {
    const card = document.createElement("div");
    card.className =
      "border border-gray-300 dark:border-neutral-700 rounded-xl p-3 bg-white dark:bg-neutral-900 flex items-center gap-3";

    const isJoinable = tournament.status.toLowerCase() === 'open' || tournament.status.toLowerCase() === 'waiting';

    card.innerHTML = `
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-gray-900 dark:text-white truncate">${tournament.name}</div>
        <div class="text-xs text-gray-500 dark:text-neutral-400 truncate">
          ${tournament.creatorUsername} · ${tournament.participantCount} players
        </div>
      </div>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(tournament.status)}">
        ${tournament.status}
      </span>
      ${isJoinable ? `
        <button data-join-id="${tournament.id}" data-join-creator="${tournament.creatorUsername}"
          class="flex-shrink-0 text-xs font-black uppercase px-3 py-1.5 rounded-lg border-2 border-gray-800 dark:border-gray-500 bg-black dark:bg-white text-white dark:text-black shadow-[2px_2px_0_0_#ff6b35] dark:shadow-[2px_2px_0_0_#0dff66] hover:brightness-110 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all">
          Join
        </button>` : ''}
    `;

    if (isJoinable) {
      card.querySelector<HTMLButtonElement>('[data-join-id]')?.addEventListener('click', async () => {
        await joinTournament(tournament.id, tournament.creatorUsername);
      });
    }

    tournamentList.appendChild(card);
  });
}

// ==============================
// Helpers
// ==============================

function renderError(message: string): void {
  tournamentList.innerHTML = `<div class="text-sm text-red-500 py-2">${message}</div>`;
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "open":
    case "waiting":
      return "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "in_progress":
    case "started":
      return "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "finished":
      return "bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    default:
      return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
}

// ==============================
// Create Tournament mini-modal
// ==============================

let listenersSetUp = false;

function ensureListenersSetUp(): void {
  if (listenersSetUp) return;
  listenersSetUp = true;

  console.log('[TournamentsList] Setting up event listeners for create modal');

  const modal        = document.getElementById('tournament-create-modal');
  const cancelBtn    = document.getElementById('tournament-create-cancel');
  const confirmBtn   = document.getElementById('tournament-create-confirm');
  const nameInput    = document.getElementById('tournament-create-name');

  console.log('[TournamentsList] Modal:', !!modal, 'Cancel:', !!cancelBtn, 'Confirm:', !!confirmBtn, 'Input:', !!nameInput);

  // Cancel button
  if (cancelBtn) {
    cancelBtn.onclick = (e) => { e.stopPropagation(); closeCreateModal(); };
  }

  // Confirm button
  if (confirmBtn) {
    confirmBtn.onclick = (e) => { e.stopPropagation(); handleCreateConfirm(); };
  }

  // Modal backdrop click
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCreateModal();
    });
  }

  // Enter key in input
  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        e.preventDefault();
        handleCreateConfirm();
      }
    });
  }
}

export function openCreateModal(): void {
  ensureListenersSetUp();

  const modal   = document.getElementById('tournament-create-modal');
  const input   = document.getElementById('tournament-create-name') as HTMLInputElement | null;
  const errEl   = document.getElementById('tournament-create-error');
  if (!modal) {
    console.error('[TournamentsList] Modal not found!');
    return;
  }

  if (input)  input.value = '';
  if (errEl)  { errEl.textContent = ''; errEl.classList.add('hidden'); }

  console.log('[TournamentsList] Opening create modal');
  modal.classList.remove('hidden');
  setTimeout(() => input?.focus(), 50);
}

function closeCreateModal(): void {
  const modal = document.getElementById('tournament-create-modal');
  if (modal) {
    console.log('[TournamentsList] Closing create modal');
    modal.classList.add('hidden');
  }
}

async function handleCreateConfirm(): Promise<void> {
  console.log('[TournamentsList] Create confirm clicked');
  const input   = document.getElementById('tournament-create-name') as HTMLInputElement | null;
  const errEl   = document.getElementById('tournament-create-error');
  const btn     = document.getElementById('tournament-create-confirm') as HTMLButtonElement | null;

  const name = input?.value.trim() ?? '';
  if (!name) {
    console.log('[TournamentsList] No name entered');
    if (errEl) { errEl.textContent = 'Please enter a tournament name.'; errEl.classList.remove('hidden'); }
    input?.focus();
    return;
  }
  if (errEl) errEl.classList.add('hidden');

  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

  try {
    console.log('[TournamentsList] Creating tournament:', name);
    await createTournament(name);
    closeCreateModal();
    await loadTournaments(); // refresh list in background
  } catch (err) {
    console.error('[TournamentsList] Error creating tournament:', err);
    if (errEl) { errEl.textContent = 'Failed to create tournament. Try again.'; errEl.classList.remove('hidden'); }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Create & Join'; }
  }
}

// ==============================
// Auto Load & Event Wiring
// ==============================

document.addEventListener("DOMContentLoaded", () => {
  console.log('[TournamentsList] Page loaded, setting up...');
  loadTournaments();
  // Listeners will be set up when modal is first opened
});
