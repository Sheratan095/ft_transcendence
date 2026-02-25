import { showErrorToast, showInfoToast } from "../shared";

import { leaveTournament as leaveTournamentWs ,
		cancelTournament as cancelTournamentWs } from "../pong/ws";
import {openTournamentModal,
	addPartecipantToModal,
	removePartecipantFromModal,
	updateBracketInModal,
	updateCooldownInModal,
	closeTournamentModal,
	} from "./TournamentModal";

let partecipants: any[] = [];
let tournamentId : string= ""; // This should be set when opening the tournament modal
let tournamentCreator: string = ""; // This should be set when loading the tournament details

export async function joinTournament(tournamentId: string, tournamentCreator: string)
{
	// RESET
	partecipants = [];
	tournamentId = "";
	tournamentCreator = "";

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

		tournamentCreator = tournamentCreator;
		tournamentId = tournamentId;

		// Get the partecipants list from the response
		const data = await response.json();
		partecipants = data.partecipants || [];

		openTournamentModal(tournamentId, {
			name: data.name,
			status: data.status,
			creatorId: data.creatorId,
			creatorUsername: tournamentCreator || data.creatorUsername,
		}, partecipants);

	} catch (err) {
		console.error('Error joining tournament:', err);
		showErrorToast((err as Error).message || 'An error occurred while joining the tournament');
	}
}

export async function leaveTournament(tournamentId: string)
{
	leaveTournamentWs(tournamentId);
	closeTournamentModal();
}

export async function playerJoinedTournament(tournamentId: string, player: any)
{
	partecipants.push(player);
	addPartecipantToModal(tournamentId, player);
}

export async function playerLeftTournament(tournamentId: string, player: any)
{
	partecipants = partecipants.filter(p => p.id !== player.id);
	removePartecipantFromModal(tournamentId, player);
}

export async function tournamentMatchStarted(tournamentId: string, matchInfo: any)
{
	// Open the match modal with the provided match information
}

export async function tournamentCancelled(tournamentId: string)
{
	closeTournamentModal();

	showInfoToast('The tournament has been cancelled.');
}

export async function tournamentRoundCooldown(tournamentId: string, cooldownInfo: any)
{
	updateCooldownInModal(tournamentId, cooldownInfo);
}

export async function tournamentRoundStarted(tournamentId: string, roundInfo: any)
{
	// Open game modal
}

export async function bracketUpdate(tournamentId: string, bracketInfo: any)
{
	updateBracketInModal(tournamentId, bracketInfo);
}

export async function cancelTournament(tournamentId: string)
{
	cancelTournamentWs(tournamentId);
	closeTournamentModal();
}