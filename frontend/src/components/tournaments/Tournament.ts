import { showErrorToast, showInfoToast } from "../shared";
import { fetchUserProfile, getUser } from '../../lib/auth';

import { leaveTournament as leaveTournamentWs ,
		cancelTournament as cancelTournamentWs ,
		startTournament as startTournamentWs } from "../pong/ws";
import {openTournamentModal,
	addPartecipantToModal,
	removePartecipantFromModal,
	updateBracketInModal,
	updateCooldownInModal,
	markTournamentFinished,
	closeTournamentModal,
	} from "./TournamentModal";
import { t } from "../../lib/intlayer";

let partecipants: any[] = [];
let tournamentId : string= ""; // This should be set when opening the tournament modal
let tournamentCreator: string = ""; // This should be set when loading the tournament details

export async function joinTournament(tournamentId: string, tournamentCreator: string)
{
	// RESET
	partecipants = [];

	try {
		const response = await fetch(`/api/pong/join-tournament`, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tournamentId }),
		});

		if (!response.ok)
		{
			showErrorToast(t('tournament.join-failed'));
			return ;
		}

		// Get the participants list from the response
		const data = await response.json();
		partecipants = data.participants || [];

		// Fetch creator's full profile to get avatar if not in response
		let creatorAvatar = data.creatorAvatar;
		if (!creatorAvatar && data.creatorId) {
			try {
				const creatorProfile = await fetchUserProfile(data.creatorId);
				creatorAvatar = creatorProfile?.avatarUrl;
			} catch (err) {
				console.warn('Failed to fetch creator profile:', err);
			}
		}

		openTournamentModal(tournamentId, {
			name: data.name,
			status: data.status,
			creatorId: data.creatorId,
			creatorUsername: tournamentCreator || data.creatorUsername,
			creatorAvatar: creatorAvatar,
		}, partecipants);

	} catch (err) {
		console.error('Error joining tournament:', err);
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

	showInfoToast(t('tournament.cancelled-notification')); // "The tournament has been cancelled."
}

export async function tournamentRoundCooldown(tournamentId: string, cooldownInfo: any)
{
	console.log('[Tournament] Received cooldown event:', { tournamentId, cooldownInfo });
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

export async function tournamentEnded(tournamentId: string, data: any)
{
	markTournamentFinished(tournamentId, data.winnerId, data.winnerUsername);
}

export async function cancelTournament(tournamentId: string)
{
	cancelTournamentWs(tournamentId);
	closeTournamentModal();
}

export async function startTournament(tournamentId: string)
{
	startTournamentWs(tournamentId);
}

export async function createTournament(name: string): Promise<void>
{
	try {
		const response = await fetch('/api/pong/create-tournament', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ name }),
		});

		if (!response.ok)
		{
			const err = await response.json().catch(() => ({}));
			throw new Error(err.message || 'Failed to create tournament');
		}

		const data = await response.json();
		console.log('[createTournament] Response data:', data);
		const id   = data.id ?? data.tournamentId;
		if (!id)
			throw new Error('Server did not return a tournament ID');

		console.log('[createTournament] Tournament data:', { id, name: data.name, status: data.status, creatorId: data.creatorId });

		// Get creator username from response or fallback to current user
		let creatorUsername = data.creatorUsername;
		let creatorAvatar = data.creatorAvatar;
		if (!creatorUsername) {
			const user = getUser();
			creatorUsername = user?.username ?? 'Creator';
			creatorAvatar = creatorAvatar || user?.avatarUrl;
		}

		// Fetch creator's full profile to get avatar if not in response
		if (!creatorAvatar && data.creatorId) {
			try {
				const creatorProfile = await fetchUserProfile(data.creatorId);
				creatorAvatar = creatorProfile?.avatarUrl;
			} catch (err) {
				console.warn('Failed to fetch creator profile:', err);
			}
		}

		// Join own tournament — this opens the modal
		openTournamentModal(id, {
			name: data.name,
			status: data.status,
			creatorId: data.creatorId,
			creatorUsername: creatorUsername,
			creatorAvatar: creatorAvatar,
		}, data.participants ?? []);
	} catch (err) {
		console.error('Error creating tournament:', err);
		throw err; // re-throw so caller can react (e.g. show error in mini modal)
	}
}

export async function newRoundStarted(roundInfo: any)
{
	// Update the tournament modal with the new round information
	console.log('[newRoundStarted] Round info:', roundInfo);
}