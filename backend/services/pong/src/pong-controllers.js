import { calculateElo, extractUserData } from './pong-help.js';
import { tournamentManager } from './TournamentManager.js';
import { gameManager } from './GameManager.js';
import { getUsernameById, sleep, checkBlock, isUserBusyInternal } from './pong-help.js';

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

		const	elo = calculateElo(userStats.wins, userStats.losses);

		const	response =
		{
			gamesPlayed: userStats.games_played,
			gamesWon: userStats.wins,
			gamesLost: userStats.losses,
			elo: elo.elo,
			rank: elo.rank
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

		// Map the match history to a cleaner format if needed
		for (let match of matchHistory)
		{
			match.playerXId = match.player_x_id;
			match.playerOId = match.player_o_id;
			match.winnerId = match.winner_id;
			match.endedAt = match.ended_at;
			delete match.player_x_id;
			delete match.player_o_id;
			delete match.winner_id;
			delete match.ended_at;
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