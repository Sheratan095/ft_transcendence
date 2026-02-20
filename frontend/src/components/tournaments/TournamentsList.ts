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
    tournamentList = document.getElementById(
    "tournament-list"
  ) as HTMLElement;

  if (!tournamentList) {
    throw new Error("Tournament list element not found");
  }
  try {
    tournamentList.innerHTML = `
      <div class="text-sm text-gray-500 dark:text-neutral-400">
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

    console.log('Tournaments loaded successfully, response:', response);
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
      <div class="text-sm text-gray-500 dark:text-neutral-400">
        No tournaments available.
      </div>
    `;
    return;
  }

  tournaments.forEach((tournament) => {
    const card = document.createElement("div");

    card.className =
      "border border-gray-300 dark:border-neutral-800 rounded-xl p-4 bg-gray-100 dark:bg-neutral-800 flex justify-between items-center mb-3";

    card.innerHTML = `
      <div>
        <div class="font-semibold text-gray-900 dark:text-white">
          ${tournament.name}
        </div>
        <div class="text-xs text-gray-600 dark:text-neutral-400">
          Created by ${tournament.creatorUsername}
        </div>
        <div class="text-xs text-gray-600 dark:text-neutral-400">
          ${tournament.participantCount} participants
        </div>
      </div>

      <span class="text-xs px-2 py-1 rounded-full ${getStatusColor(
        tournament.status
      )}">
        ${tournament.status}
      </span>
    `;

    tournamentList.appendChild(card);
  });
}

// ==============================
// Create Tournament (POST)
// ==============================

export async function createTournament(name: string): Promise<void> {
  try {
    const response = await fetch("/api/pong/create-tournament", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || "Failed to create tournament");
    }

    // Refresh list after creation
    await loadTournaments();

  } catch (err) {
    alert((err as Error).message);
  }
}

// ==============================
// Helpers
// ==============================

function renderError(message: string): void {
  tournamentList.innerHTML = `
    <div class="text-sm text-red-500">
      ${message}
    </div>
  `;
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "open":
      return "bg-green-200 text-green-800";
    case "in_progress":
      return "bg-yellow-200 text-yellow-800";
    case "finished":
      return "bg-gray-300 text-gray-700";
    default:
      return "bg-gray-200 text-gray-800";
  }
}

// ==============================
// Auto Load on Page Ready
// ==============================

document.addEventListener("DOMContentLoaded", () => {
  loadTournaments();
});

// ==============================
// Optional: Hook Create Button
// ==============================

document
  .getElementById("tournament-create-btn")
  ?.addEventListener("click", () => {
    const name = prompt("Tournament name?");
    if (name) {
      createTournament(name);
    }
  });