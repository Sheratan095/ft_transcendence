import { calculateElo, getUsernameById } from './tris-help.js';

//-----------------------------INTERNAL ROUTES-----------------------------

export const	createUserStats = async (req, reply) =>
{
	try
	{
		const	trisDb = req.server.trisDb;
		const	userId = req.body.userId;

		// Check if stats already exist for the user
		const	existingStats = await trisDb.getUserStats(userId);
		if (existingStats)
			return (reply.code(400).send({error: 'User stats already exist' }));

		// Create new stats entry
		await trisDb.createUserStats(userId);
		console.log(`[TRIS] Created stats for user ${userId}`);

		return (reply.code(201).send({message: 'User stats created successfully' }));
	}
	catch (err)
	{
		console.error('[TRIS] Error in createUserStats controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	deleteUserStats = async (req, reply) =>
{
	try
	{
		const	trisDb = req.server.trisDb;
		const	userId = req.body.userId;

		// Check if stats exist for the user
		const	existingStats = await trisDb.getUserStats(userId);
		if (!existingStats)
			return (reply.code(404).send({error: 'User stats not found' }));

		// Delete stats entry
		await trisDb.deleteUserStats(userId);
		console.log(`[TRIS] Deleted stats for user ${userId}`);

		return (reply.code(200).send({message: 'User stats deleted successfully' }));
	}
	catch (err)
	{
		console.error('[TRIS] Error in deleteUserStats controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

//-----------------------------PUBLIC ROUTES-----------------------------

export const	getUserStats = async (req, reply) =>
{
	try
	{
		const	trisDb = req.server.trisDb;
		const	userId = req.query.id;

		// Retrieve user stats
		// { user_id: '1', games_played: 0, wins: 0, losses: 0, draws: 0 }
		const	userStats = await trisDb.getUserStats(userId);
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

		console.log(`[TRIS] Retrieved stats for user ${userId}`);

		return (reply.code(200).send(response));
	}
	catch (err)
	{
		console.error('[TRIS] Error in getUserStats controller:', err);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	getUserMatchHistory = async (req, reply) =>
{
	try
	{
		const	trisDb = req.server.trisDb;
		const	userId = req.query.id;

		// Retrieve match history for the user
		const	matchHistory = await trisDb.getMatchesForUser(userId);
		if (!matchHistory || matchHistory.length === 0)
			return (reply.code(404).send({ error: 'No match history found for user' }));

		// Map the match history to a cleaner format if needed
		for (let match of matchHistory)
		{
			match.playerXId = match.player_x_id;
			match.playerOId = match.player_o_id;
			match.winnerId = match.winner_id;
			match.endedAt = match.ended_at;
			match.playerXUsername = (await getUsernameById(match.player_x_id)) || process.env.PLACEHOLDER_DELETED_USERNAMES;
			match.playerOUsername = (await getUsernameById(match.player_o_id)) || process.env.PLACEHOLDER_DELETED_USERNAMES;
			delete match.player_x_id;
			delete match.player_o_id;
			delete match.winner_id;
			delete match.ended_at;
		}

		console.log(`[TRIS] Retrieved match history for user ${userId}`);

		return (reply.code(200).send(matchHistory));
	}
	catch (err)
	{
		console.error('[TRIS] Error in getUserMatchHistory controller:', err);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}