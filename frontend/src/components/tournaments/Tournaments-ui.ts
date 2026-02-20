import { loadTournaments } from './TournamentsList';


function StopTournamentModal()
{
	const modal = document.getElementById('tournament-modal');
	if (modal) {
		modal.classList.add('hidden');
		document.body.style.overflow = 'auto'; // UNLOCK SCROLLING
	}
}

export async function OpenTournamentModal()
{
	const modal = document.getElementById('tournament-modal');
	if (modal) {
		const textSpan = modal.querySelector('#tournament-modal-name') as HTMLSpanElement | null;
		if (textSpan) textSpan.textContent = 'Loading...';
		
		try {
			await loadTournaments();
		}
		catch (err) {
			console.error('Failed to load tournaments:', err);
				if (textSpan) textSpan.textContent = 'Failed to load tournaments';
				return;
			}
			
		document.body.style.overflow = 'hidden';
		modal.classList.remove('hidden');
	}
}

export function SetupTournamentModal()
{
	const modal = document.getElementById('tournament-modal');
	if (!modal) {
		console.error('Tournament modal element not found');
		return;
	}
	
	const closeBtn = modal.querySelector('#lobby-close-btn') as HTMLButtonElement | null;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			StopTournamentModal();
		});
	}
}

export function RefreshTournamentModal()
{
	const modal = document.getElementById('tournament-modal');
	if (!modal) {
		console.error('Tournament modal element not found');
		return;
	}
	
	const textSpan = modal.querySelector('#tournament-modal-name') as HTMLSpanElement | null;
	if (textSpan) textSpan.textContent = 'Refreshing...';
	
	try {
		loadTournaments();
	}
	catch (err) {
		console.error('Failed to refresh tournaments:', err);
			if (textSpan) textSpan.textContent = 'Failed to refresh tournaments';
			return;
		}
		if (textSpan) textSpan.textContent = 'Refreshed!';
		setTimeout(() => {
			if (textSpan) textSpan.textContent = '';
		}, 2000);
}

export function CloseTournamentModal()
{
	const modal = document.getElementById('tournament-modal');
	if (modal) {
		modal.classList.add('hidden');
		document.body.style.overflow = 'auto'; // UNLOCK SCROLLING
	}
}