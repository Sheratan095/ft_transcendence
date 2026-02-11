
export async function attachTorunamentElements() {
  try {
    const response = await fetch('/api/pong/get-all-tournaments', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to load tournaments', response.status);
      return;
    }

    const tournaments = await response.json();

    const list = document.getElementById('list');
    if (!list) return;

    list.innerHTML = '';

    tournaments.forEach((tournament: any) => {
      const item = document.createElement('div');

      item.className = 'mb-4 p-3 rounded border border-gray-300 dark:border-neutral-400 shadow-sm';
      item.innerHTML = `
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-accent-green">${escapeHtml(
              tournament.name,
            )}</h2>
            <p class="text-sm text-gray-700 dark:text-neutral-400">Participants: ${
              tournament.participants?.length ?? 0
            }</p>
          </div>
          <div class="flex items-center gap-2">
            <button data-id="${tournament.id}" class="join-tournament-button px-3 py-1 rounded bg-accent-orange dark:bg-accent-green text-black font-bold">Join</button>
          </div>
        </div>
      `;

      const joinBtn = item.querySelector('.join-tournament-button') as HTMLButtonElement | null;
      if (joinBtn) {
        joinBtn.addEventListener('click', async (ev) => {
          const id = (ev.currentTarget as HTMLButtonElement).dataset.id;
          if (!id) return;
          // Simple join request - adapt endpoint as needed
          try {
            const res = await fetch(`/api/pong/join-tournament/${id}`, {
              method: 'POST',
              credentials: 'include',
            });
            if (!res.ok) throw new Error('Join failed');
            // Optionally refresh list or show feedback
            attachTorunamentElements();
          } catch (err) {
            console.error('Failed to join tournament', err);
          }
        });
      }

      list.appendChild(item);
    });
  } catch (err) {
    console.error('Error loading tournaments', err);
  }
}

function escapeHtml(str: string) {
  return String(str).replace(/[&<>"']/g, (s) => {
    switch (s) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return s;
    }
  });
}

// Wire modal open/close when this module is loaded
document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.getElementById('tournamentListButton');
  const modal = document.getElementById('tournament-modal');
  const backdrop = document.getElementById('tournament-backdrop');
  const closeBtn = document.getElementById('tournament-close-btn');

  async function openModal() {
    if (!modal) return;
    modal.classList.remove('hidden');
    await attachTorunamentElements();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);

  // close on Escape
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeModal();
  });
});