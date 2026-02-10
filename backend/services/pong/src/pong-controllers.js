import { calculateElo, extractUserData } from './pong-help.js';
import { tournamentManager } from './TournamentManager.js';
import { getUsernameById, isUserBusyInternal } from './pong-help.js';
import { GameStatus } from './GameInstance.js';

//-----------------------------INTERNAL ROUTES-----------------------------

export const	createUserStats = async (req, reply) =>
{
	try
	{
		const	pongDb = req.server.pongDb;
		const	userId = req.body.userId;

		// Check if stats already exist for the user
		const	existingStats = await pongDb.getUserStats(userId);
		if (existingStats)
			return (reply.code(400).send({error: 'User stats already exist' }));

		// Create new stats entry
		await pongDb.createUserStats(userId);
		console.log(`[PONG] Created stats for user ${userId}`);

		return (reply.code(201).send({message: 'User stats created successfully' }));
	}
	catch (err)
	{
		console.error('[PONG] Error in createUserStats controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	deleteUserStats = async (req, reply) =>
{
	try
	{
		const	pongDb = req.server.pongDb;
		const	userId = req.body.userId;

		// Check if stats exist for the user
		const	existingStats = await pongDb.getUserStats(userId);
		if (!existingStats)
			return (reply.code(404).send({error: 'User stats not found' }));

		// Delete stats entry
		await pongDb.deleteUserStats(userId);
		console.log(`[PONG] Deleted stats for user ${userId}`);

		return (reply.code(200).send({message: 'User stats deleted successfully' }));
	}
	catch (err)
	{
		console.error('[PONG] Error in deleteUserStats controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	isUserBusy = async (req, reply) =>
{
	try
	{
		const	userId = req.query.userId;

		// Check if user is in an active game, not including TRIS because this call should be done from tris service
		const	isInGame = await isUserBusyInternal(userId, false);

		return (reply.code(200).send({ isBusy: isInGame }));
	}
	catch (err)
	{
		console.error('[PONG] Error in isUserBusy controller:', err);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

//-----------------------------PUBLIC ROUTES-----------------------------

export const	getUserStats = async (req, reply) =>
{
	try
	{
		const	pongDb = req.server.pongDb;
		const	userId = req.query.id;

		// Retrieve user stats
		// { user_id: '1', games_played: 0, wins: 0, losses: 0, draws: 0 }
		const	userStats = await pongDb.getUserStats(userId);
		if (!userStats)
			return (reply.code(404).send({ error: 'User stats not found' }));

		const	elo = calculateElo(userStats.wins, userStats.losses, userStats.tournament_wins);

		const	response =
		{
			gamesPlayed: userStats.games_played,
			gamesWon: userStats.wins,
			gamesLost: userStats.losses,
			elo: elo.elo,
			rank: elo.rank,
			tournamentsWon: userStats.tournament_wins,
			tournamentsParticipated: userStats.tournaments_participated
		}

		console.log(`[PONG] Retrieved stats for user ${userId}`);

		return (reply.code(200).send(response));
	}
	catch (err)
	{
		console.error('[PONG] Error in getUserStats controller:', err);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	getUserMatchHistory = async (req, reply) =>
{
	try
	{
		const	pongDb = req.server.pongDb;
		const	userId = req.query.id;

		// Retrieve match history for the user
		const	matchHistory = await pongDb.getMatchesForUser(userId);
		if (!matchHistory || matchHistory.length === 0)
			return (reply.code(404).send({ error: 'No match history found for user' }));

		// Map the match history to a cleaner format
		for (let match of matchHistory)
		{
			match.id = match.id;
			match.playerLeftId = match.player_left_id;
			match.playerLeftUsername = await getUsernameById(match.player_left_id);
			match.playerRightId = match.player_right_id;
			match.playerRightUsername = await getUsernameById(match.player_right_id);
			match.status = GameStatus.FINISHED;
			match.winnerId = match.winner_id;
			match.isBye = false;
			match.endedAt = match.ended_at;
			match.tournamentId = match.tournament_id;
			match.playerLeftScore = match.player_left_score;
			match.playerRightScore = match.player_right_score;

			delete match.player_left_id;
			delete match.player_right_id;
			delete match.player_left_score;
			delete match.player_right_score;
			delete match.winner_id;
			delete match.ended_at;
			delete match.tournament_id;
		}

		console.log(`[PONG] Retrieved match history for user ${userId}`);

		return (reply.code(200).send(matchHistory));
	}
	catch (err)
	{
		console.error('[PONG] Error in getUserMatchHistory controller:', err);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	createTournament = async (req, reply) =>
{
	try
	{
		const	name = req.body.name;
		const	creatorId = extractUserData(req).id;

		const	creatorUsername = await getUsernameById(creatorId);
		if (!creatorUsername)
			return (reply.code(404).send({ error: 'Creator user not found' }));

		// Creator must not be busy (in matchmaking or in another game including TRIS)
		if (await isUserBusyInternal(creatorId, true))
		{
			console.error(`[PONG] ${creatorId} tried to create a tournament while busy`);
			pongConnectionManager.sendErrorMessage(creatorId, 'You are already in a game or matchmaking');
			return ;
		}

		// Create a new tournament
		const	tournament = tournamentManager.createTournament(name, creatorId, creatorUsername);

		console.log(`[PONG] User ${creatorId} creted a tournament named "${name}"`);

		return (reply.code(201).send({
			tournamentId: tournament.id,
			message: 'Tournament created successfully'
		}));
	}
	catch (err)
	{
		console.error('[PONG] Error in createTournament controller:', err);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	getAllTournaments = async (req, reply) =>
{
	try
	{
		// Retrieve all tournaments
		const	tournaments = tournamentManager.getAllTournaments();
		
		return (reply.code(200).send(tournaments));
	}
	catch (err)
	{
		console.error('[PONG] Error in getAllTournaments controller:', err);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	joinTournament = async (req, reply) =>
{
	try
	{
		const	tournamentId = req.body.tournamentId;
		const	userId = extractUserData(req).id;
		const	username = await getUsernameById(userId);
		if (!username)
			return (reply.code(404).send({ error: 'User not found' }));

		// User must not be busy (in matchmaking or in another game including TRIS)
		if (await isUserBusyInternal(userId, true))
		{
			console.error(`[PONG] ${userId} tried to join a tournament while busy`);
			pongConnectionManager.sendErrorMessage(userId, 'You are already in a game or matchmaking');
			return ;
		}

		// Add participant to the tournament
		tournamentManager.addParticipant(tournamentId, userId, username);

		const	participants = tournamentManager.getParticipants(tournamentId);

		return (reply.code(200).send({ message: 'Joined tournament successfully', participants: participants }));
	}
	catch (err)
	{
		console.error('[PONG] Error in joinTournament controller:', err);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	getUserTournamentsParticipations = async (req, reply) =>
{
	try
	{
		const	pongDb = req.server.pongDb;
		const	userId = req.query.id;

		// Retrieve tournament participation for the user
		const	participations = await pongDb.getTournamentsParticipationsByUser(userId);
		if (!participations || participations.length === 0)
			return (reply.code(404).send({ error: 'No tournament participation found for user' }));

		// Map the participation to a cleaner format if needed
		for (let entry of participations)
		{
			entry.tournamentId = entry.tournament_id;
			entry.tournamentName = entry.tournament_name;
			entry.endedAt = entry.finished_at;
			entry.winnerUsername = await getUsernameById(entry.winner_id);
			entry.top = entry.top;
			delete entry.winner_id;
			delete entry.tournament_id;
			delete entry.tournament_name;
			delete entry.finished_at;
		}

		console.log(`[PONG] Retrieved tournaments participations for user ${userId}`);

		return (reply.code(200).send(participations));
	}
	catch (err)
	{
		console.error('[PONG] Error in getUserTournamentsParticipations controller:', err);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	getTournamentBracket = async (req, reply) =>
{
	try
	{
		const	tournamentId = req.params.id;

		// Get bracket state from tournament manager
		const	bracket = tournamentManager.getTournamentBracket(tournamentId);
		if (!bracket)
			return (reply.code(404).send({ error: 'Tournament not found or finished' }));

		console.log(`[PONG] Retrieved bracket for tournament ${tournamentId}`);

		return (reply.code(200).send(bracket));
	}
	catch (err)
	{
		console.error('[PONG] Error in getTournamentBracket controller:', err);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	testGetTournament = async (req, reply) =>
{
	try
	{
		const data = {
			participant: [
				{ id: 0, tournament_id: 0, name: 'Alice' },
				{ id: 1, tournament_id: 0, name: 'Bob' },
				{ id: 2, tournament_id: 0, name: 'Charlie' },
				{ id: 3, tournament_id: 0, name: 'David' },
				{ id: 4, tournament_id: 0, name: 'Eve' },
				{ id: 5, tournament_id: 0, name: 'Frank' },
				{ id: 6, tournament_id: 0, name: 'Grace' },
				{ id: 7, tournament_id: 0, name: 'BYE' },
			],
			stage: [
				{
					id: 0,
					tournament_id: 0,
					name: 'Final Stage',
					type: 'single_elimination',
					number: 1,
					settings: { size: 8, seedOrdering: ['natural'] },
				},
			],
			group: [{ id: 0, stage_id: 0, number: 1 }],
			round: [
				{ id: 0, group_id: 0, number: 1, stage_id: 0 },
				{ id: 1, group_id: 0, number: 2, stage_id: 0 },
				{ id: 2, group_id: 0, number: 3, stage_id: 0 },
			],
			match: [
				// Round 1 - Quarter Finals
				{ id: 0, stage_id: 0, group_id: 0, round_id: 0, number: 1, status: 4, child_count: 0, opponent1: { id: 0, position: 1, score: 11, result: 'win', name: 'Alice' }, opponent2: { id: 1, position: 2, score: 5, result: 'loss', name: 'Bob' } },
				{ id: 1, stage_id: 0, group_id: 0, round_id: 0, number: 2, status: 4, child_count: 0, opponent1: { id: 2, position: 1, score: 11, result: 'win', name: 'Charlie' }, opponent2: { id: 3, position: 2, score: 8, result: 'loss', name: 'David' } },
				{ id: 2, stage_id: 0, group_id: 0, round_id: 0, number: 3, status: 4, child_count: 0, opponent1: { id: 4, position: 1, score: 11, result: 'win', name: 'Eve' }, opponent2: { id: 5, position: 2, score: 2, result: 'loss', name: 'Frank' } },
				{ id: 3, stage_id: 0, group_id: 0, round_id: 0, number: 4, status: 4, child_count: 0, opponent1: { id: 6, position: 1, score: 11, result: 'win', name: 'Grace' }, opponent2: { id: 7, position: 2, score: 0, result: 'loss', name: 'BYE' } },
				// Round 2 - Semi Finals
				{ id: 4, stage_id: 0, group_id: 0, round_id: 1, number: 1, status: 4, child_count: 0, opponent1: { id: 0, position: 1, score: 11, result: 'win', name: 'Alice' }, opponent2: { id: 4, position: 2, score: 9, result: 'loss', name: 'Eve' } },
				{ id: 5, stage_id: 0, group_id: 0, round_id: 1, number: 2, status: 4, child_count: 0, opponent1: { id: 2, position: 1, score: 6, result: 'loss', name: 'Charlie' }, opponent2: { id: 6, position: 2, score: 11, result: 'win', name: 'Grace' } },
				// Round 3 - Final
				{ id: 6, stage_id: 0, group_id: 0, round_id: 2, number: 1, status: 4, child_count: 0, opponent1: { id: 0, position: 1, score: 11, result: 'win', name: 'Alice' }, opponent2: { id: 2, position: 2, score: 10, result: 'loss', name: 'Charlie' } },
			],
			match_game: [],
		};

		return (reply.code(200).send(data));
	}
	catch (err)
	{
		console.error('[PONG] Error in testGetTournament controller:', err);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}