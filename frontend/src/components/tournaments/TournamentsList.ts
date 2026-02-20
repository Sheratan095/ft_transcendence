import { showErrorToast } from "../shared";

export async function showTournamentListModal()
{
  const modal = document.getElementById('tournament-modal');
  if (!modal) {
    console.error('Tournament modal not found');
    return;
  }

  try
  {
    const response = await fetch('/api/pong/get-all-tournaments', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok)
    {
      console.error('Failed to load tournaments', response.status);
      showErrorToast('Failed to load tournaments');
      return;
    }

    const tournaments = await response.json();

    const list = document.getElementById('list');
    if (!list) {
      console.error('Tournament list element not found');
      return;
    }

    list.innerHTML = '';

    tournaments.forEach((tournament: any) =>
    {
      const item = document.createElement('div');

      item.className = 'mb-4 p-3 rounded border border-gray-300 dark:border-neutral-400 shadow-sm';
      item.innerHTML = `
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-accent-orange dark:text-accent-green">
              ${escapeHtml(tournament.name)}
            </h2>
            <p class="text-sm text-black dark:text-white">Participants:
              ${tournament.participants?.length ?? 0}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button data-id="${tournament.id}" class="join-tournament-button px-3 py-1 rounded bg-accent-orange dark:bg-accent-green text-white dark:text-black font-bold">Join</button>
          </div>
        </div>
      `;

      const joinBtn = item.querySelector('.join-tournament-button') as HTMLButtonElement | null;
      if (joinBtn)
        joinBtn.addEventListener('click', joinTournament.bind(null, tournament.id));

      list.appendChild(item);
    });

    // Show the modal after populating the list
    modal.classList.remove('hidden');
  }
  catch (err)
  {
    console.error('Error loading tournaments', err);
    showErrorToast('Failed to load tournaments');
  }
}

function escapeHtml(str: string)
{
  return String(str).replace(/[&<>"']/g, (s) =>
  {
    switch (s)
    {
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
document.addEventListener('DOMContentLoaded', () =>
{
  const modal = document.getElementById('tournament-modal');
  const backdrop = document.getElementById('tournament-backdrop');
  const closeBtn = document.getElementById('tournament-close-btn');

  function closeModal()
  {
    if (!modal)
      return;

    modal.classList.add('hidden');
  }

  if (closeBtn)
    closeBtn.addEventListener('click', closeModal);
  if (backdrop)
    backdrop.addEventListener('click', closeModal);

  // close on Escape
  document.addEventListener('keydown', (ev) =>
  {
    if (ev.key === 'Escape')
      closeModal();
  });
});

async function joinTournament(id: string)
{
    if (!id)
      return;
    // Simple join request - adapt endpoint as needed
    try
    {
      const res = await fetch(`/api/pong/join-tournament/${id}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok)
        throw new Error('Join failed');

      // Optionally refresh list or show feedback
      // await showTournamentListModal();
      // TO DO redirect to tournament page
    }
    catch (err)
    {
      console.error('Failed to join tournament', err);
      showErrorToast('Failed to join tournament');
    }
}