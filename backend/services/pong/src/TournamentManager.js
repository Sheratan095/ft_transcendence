import { TournamentInstance, TournamentStatus } from './TournamentIstance.js';
import { pongConnectionManager } from './PongConnectionManager.js';
import { v4 as uuidv4 } from 'uuid';

class	TournamentManager
{
	constructor()
	{
		this._tournaments = new Map(); // tournamentId -> TournamentInstance
	}
	
	createTournament(name, creatorId, creatorUsername)
	{
		const	id = uuidv4();

		// Create a new tournament instance
		const	tournament = new TournamentInstance(id, name, creatorId, creatorUsername);

		this._tournaments.set(id, tournament);

		pongConnectionManager.replyTournamentCreated(creatorId, name, id);

		return (tournament);
	}

	getAllTournaments()
	{
		// Map the tournaments to a simpler format
		const	tournamentList = [];

		for (let tournament of this._tournaments.values())
		{
			tournamentList.push({
				id: tournament.id,
				name: tournament.name,
				status: tournament.status,
				createdAt: tournament.createdAt,
				creatorUsername: tournament.creatorUsername,
				participantCount: tournament.participants.size,
			});
		}

		return (tournamentList);
	}

	addParticipant(tournamentId, userId, username)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
		{
			console.log(`[PONG] User ${userId} tried to join non-existent tournament ${tournamentId}`);
			pongConnectionManager.sendErrorMessage(userId, 'Tournament not found');
			return ;
		}

		// Only allow joining if the tournament is in WAITING status
		if (tournament.status !== TournamentStatus.WAITING)
		{
			console.log(`[PONG] User ${userId} tried to join tournament ${tournamentId} which is not in WAITING status`);
			pongConnectionManager.sendErrorMessage(userId, 'Tournament is not open for joining');
			return ;
		}

		tournament.addParticipant(userId, username);

		// Reply to the user and notify other participants
		for (let participant of tournament.participants)
		{
			if (participant.userId !== userId)
				pongConnectionManager.notifyTournamentParticipantJoined(participant.userId, username, tournament.name, tournamentId);
		}
	}

	getParticipants(tournamentId)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
		{
			console.log(`[PONG] Tried to get participants of non-existent tournament ${tournamentId}`);
			return ([]); // Return empty array if tournament does not exist
		}

		return (Array.from(tournament.participants).map(participant => ({
			userId: participant.userId,
			username: participant.username
		})));
	}

	// TO DO
	handleUserDisconnect(userId)
	{
		for (let tournament of this._tournaments.values())
		{
			if (tournament.hasParticipant(userId))
			{
				tournament.removeParticipant(userId);

				// Notify remaining participants
				for (let participant of tournament.participants)
					pongConnectionManager.notifyTournamentParticipantLeft(participant.userId, userId, tournament.name, tournament.id);
			}
		}
	}

	removeParticipant(tournamentId, userId)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
		{
			console.log(`[PONG] User ${userId} tried to leave non-existent tournament ${tournamentId}`);
			pongConnectionManager.sendErrorMessage(userId, 'Tournament not found');
			return ;
		}

		if (!tournament.hasParticipant(userId))
		{
			console.log(`[PONG] User ${userId} tried to leave tournament ${tournamentId} but is not a participant`);
			pongConnectionManager.sendErrorMessage(userId, 'You are not a participant of this tournament');
		}

		tournament.removeParticipant(userId);

		// Notify remaining participants
		for (let participant of tournament.participants)
			pongConnectionManager.notifyTournamentParticipantLeft(participant.userId, userId, tournament.name, tournamentId);
	}
}

export const	tournamentManager = new TournamentManager();