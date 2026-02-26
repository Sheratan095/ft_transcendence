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

let tournamentList: HTMLElement | null = null;
let tournamentRefreshInterval: number | null = null;
let previousTournaments: Tournament[] = [];
let hasInitialLoad = false;

// ==============================
// Load Tournaments (GET)
// ==============================

export async function loadTournaments() {
  tournamentList = document.getElementById("tournament-list") as HTMLElement | null;

  if (!tournamentList) {
    // Container not present on this page/route; skip silently.
    console.warn('Tournament list element not found, skipping load.');
    return;
  }

  try {
    const response = await fetch("/api/pong/get-all-tournaments", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || "Failed to load tournaments");
    }

    const tournaments: Tournament[] = await response.json();

    // Render on first load or if tournaments have changed
    if (!hasInitialLoad || JSON.stringify(tournaments) !== JSON.stringify(previousTournaments)) {
      hasInitialLoad = true;
      previousTournaments = tournaments;
      renderTournaments(tournaments);
    }

  } catch (err) {
    renderError((err as Error).message);
  }
}

// ==============================
// Render Tournaments
// ==============================

function renderTournaments(tournaments: Tournament[]): void {
  if (!tournamentList) {
    tournamentList = document.getElementById("tournament-list") as HTMLElement | null;
    if (!tournamentList) return; // nothing to render to
  }

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
          class="flex-shrink-0 text-xs font-black uppercase px-3 py-1.5 rounded-lg border-2 dark:border-gray-500 bg-accent-orange dark:bg-white text-white dark:text-black hover:brightness-110">
          Join
        </button>` : ''}
    `;

    if (isJoinable) {
      card.querySelector<HTMLButtonElement>('[data-join-id]')?.addEventListener('click', async () => {
        await joinTournament(tournament.id, tournament.creatorUsername);
      });
    }

    tournamentList?.appendChild(card);
  });
}

// ==============================
// Helpers
// ==============================

function renderError(message: string): void {
  if (!tournamentList) {
    tournamentList = document.getElementById("tournament-list") as HTMLElement | null;
    if (!tournamentList) return;
  }

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

  const modal        = document.getElementById('tournament-create-modal');
  const cancelBtn    = document.getElementById('tournament-create-cancel');
  const confirmBtn   = document.getElementById('tournament-create-confirm');
  const nameInput    = document.getElementById('tournament-create-name');

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
  if (!modal) return;

  if (input)  input.value = '';
  if (errEl)  { errEl.textContent = ''; errEl.classList.add('hidden'); }

  modal.classList.remove('hidden');
  setTimeout(() => input?.focus(), 50);
}

function closeCreateModal(): void {
  const modal = document.getElementById('tournament-create-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

async function handleCreateConfirm(): Promise<void> {
  const input   = document.getElementById('tournament-create-name') as HTMLInputElement | null;
  const errEl   = document.getElementById('tournament-create-error');
  const btn     = document.getElementById('tournament-create-confirm') as HTMLButtonElement | null;

  const name = input?.value.trim() ?? '';
  if (!name) {
    if (errEl) { errEl.textContent = 'Please enter a tournament name.'; errEl.classList.remove('hidden'); }
    input?.focus();
    return;
  }
  if (errEl) errEl.classList.add('hidden');

  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

  try {
    await createTournament(name);
    closeCreateModal();
    await loadTournaments(); // refresh list in background
  } catch (err) {
    if (errEl) { errEl.textContent = 'Failed to create tournament. Try again.'; errEl.classList.remove('hidden'); }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Create & Join'; }
  }
}

// ==============================
// Auto-refresh helpers
// ==============================

export function startTournamentAutoRefresh(intervalMs = 500): void {
  stopTournamentAutoRefresh();
  tournamentRefreshInterval = window.setInterval(() => {
    // Fire-and-forget; loadTournaments handles its own errors
    void loadTournaments();
  }, intervalMs);
}

export function stopTournamentAutoRefresh(): void {
  if (tournamentRefreshInterval !== null) {
    clearInterval(tournamentRefreshInterval);
    tournamentRefreshInterval = null;
  }
}

// ==============================
// Auto Load & Event Wiring
// ==============================

document.addEventListener("DOMContentLoaded", () => {
  // Load once immediately, then start periodic refresh
  loadTournaments();
  startTournamentAutoRefresh(500);
  // Ensure we stop the interval when navigating away / unloading
  window.addEventListener('beforeunload', () => stopTournamentAutoRefresh());
  // Listeners will be set up when modal is first opened
});
