import { showErrorToast } from "../shared";

export async function joinTournament(tournamentId: string)
{
	try {
		const response = await fetch(`/api/pong/join-tournament/${tournamentId}`, {
			method: 'POST',
			credentials: 'include',
		});

		if (!response.ok)
		{
			showErrorToast('Failed to join tournament. Please try again later.');
			return ;
		}

		
	} catch (err) {
		console.error('Error joining tournament:', err);
		showErrorToast((err as Error).message || 'An error occurred while joining the tournament');
	}
}
