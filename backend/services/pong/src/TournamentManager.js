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
			throw new Error('Tournament not found');

		// Only allow joining if the tournament is in WAITING status
		if (tournament.status !== TournamentStatus.WAITING)
			throw new Error('Cannot join a tournament that is not in the WAITING status');

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
			throw new Error('Tournament not found');

		return (Array.from(tournament.participants).map(participant => ({
			userId: participant.userId,
			username: participant.username
		})));
	}
}

export const	tournamentManager = new TournamentManager();