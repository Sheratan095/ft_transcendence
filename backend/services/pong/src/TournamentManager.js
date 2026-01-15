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
}

export const	tournamentManager = new TournamentManager();