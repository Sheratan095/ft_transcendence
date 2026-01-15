import { TournamentInstance, TournamentStatus } from './TournamentIstance.js';

class	TournamentManager
{
	constructor()
	{
		this._tournaments = new Map(); // tournamentId -> TournamentInstance
	}
	
	createTournament(creatorId, name)
	{
		const	tournament = new TournamentInstance(creatorId, name);
		this._tournaments.set(tournament.id, tournament);

		return (tournament);
	}

	getAllTournaments()
	{
		
	}
}

export const	tournamentManager = new TournamentManager();