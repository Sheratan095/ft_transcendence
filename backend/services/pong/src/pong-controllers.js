import { calculateElo, extractUserData } from './pong-help.js';
import { tournamentManager } from './TournamentManager.js';
import { getUsernameById, isUserBusyInternal } from './pong-help.js';
import { GameStatus } from './GameInstance.js';
import { TournamentStatus } from './TournamentIstance.js';
import { pongConnectionManager } from './PongConnectionManager.js';

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

export const	removeWsConnection = async (req, reply) =>
{
	try
	{
		const	userId = req.body.userId;

		// Remove WS connection options for the user
		pongConnectionManager.removeConnection(userId);

		return (reply.code(200).send({ message: 'WS connection removed successfully' }));
	}
	catch (err)
	{
		console.error('[PONG] Error in removeWsConnection controller:', err);
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
			match.isBye = match.is_bye;
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
			return (reply.code(400).send({ error: 'You are already in a game or matchmaking' }));
		}

		// Create a new tournament
		const	tournament = tournamentManager.createTournament(name, creatorId, creatorUsername);

		console.log(`[PONG] User ${creatorId} created a tournament named "${name}"`);

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
		// Create a test tournament
		const	testTournament = tournamentManager.createTournament(
			'Test Tournament',
			'test-creator-id',
			'TestCreator'
		);

		// Add test participants (6 + creator = 7 total, which will create a BYE match)
		const	participants = [
			{ userId: 'test-user-1', username: 'Alice' },
			{ userId: 'test-user-2', username: 'Bob' },
			{ userId: 'test-user-3', username: 'Charlie' },
			{ userId: 'test-user-4', username: 'David' },
			{ userId: 'test-user-5', username: 'Eve' },
			{ userId: 'test-user-6', username: 'Frank' },
			{ userId: 'test-user-7', username: 'Grace' },
			{ userId: 'test-user-8', username: 'Hannah' },
			{ userId: 'test-user-9', username: 'Ivan' },
			{ userId: 'test-user-10', username: 'Judy' },
			{ userId: 'test-user-11', username: 'Karl' }
		];
		for (const participant of participants)
			testTournament.addParticipant(participant.userId, participant.username);

		// Start the tournament (this creates the first round with matches)
		testTournament.startTournament();

		// Simulate completion of first round matches
		const	firstRoundMatches = testTournament.rounds[0];
		for (const match of firstRoundMatches)
		{
			if (!match.isBye)
			{
				// Set match as finished with simulated scores
				match.gameStatus = GameStatus.FINISHED;
				match.scores[match.playerLeftId] = 11;
				match.scores[match.playerRightId] = Math.floor(Math.random() * 10);
				match.winnerId = match.playerLeftId; // Left player always wins
				match.winner = { userId: match.playerLeftId, username: match.playerLeftUsername };
				match.endedAt = new Date().toISOString();
			}
		}

		// Advance to next round
		testTournament._advanceToNextRound();

		// Simulate completion of second round (semi-finals)
		const	secondRoundMatches = testTournament.rounds[1];
		for (const match of secondRoundMatches)
		{
			match.gameStatus = GameStatus.FINISHED;
			match.scores[match.playerLeftId] = 11;
			match.scores[match.playerRightId] = Math.floor(Math.random() * 10);
			match.winnerId = match.playerLeftId;
			match.winner = { userId: match.playerLeftId, username: match.playerLeftUsername };
			match.endedAt = new Date().toISOString();
		}

		// Advance to round 3 (semifinals with potential bye)
		testTournament._advanceToNextRound();

		// Simulate completion of round 3 (semifinals)
		const	thirdRoundMatches = testTournament.rounds[2];
		if (thirdRoundMatches)
		{
			for (const match of thirdRoundMatches)
			{
				if (!match.isBye)
				{
					match.gameStatus = GameStatus.FINISHED;
					match.scores[match.playerLeftId] = 11;
					match.scores[match.playerRightId] = Math.floor(Math.random() * 10);
					match.winnerId = match.playerLeftId;
					match.winner = { userId: match.playerLeftId, username: match.playerLeftUsername };
					match.endedAt = new Date().toISOString();
				}
			}
		}

		// Advance to final round if tournament not finished yet
		if (testTournament.status !== TournamentStatus.FINISHED)
			testTournament._advanceToNextRound();

		// Simulate completion of final match
		if (testTournament.rounds.length > 3)
		{
			const	finalMatch = testTournament.rounds[testTournament.rounds.length - 1][0];
			if (finalMatch && !finalMatch.isBye)
			{
				finalMatch.gameStatus = GameStatus.FINISHED;
				finalMatch.scores[finalMatch.playerLeftId] = 11;
				finalMatch.scores[finalMatch.playerRightId] = 10;
				finalMatch.winnerId = finalMatch.playerLeftId;
				finalMatch.winner = { userId: finalMatch.playerLeftId, username: finalMatch.playerLeftUsername };
				finalMatch.endedAt = new Date().toISOString();

				// Check if tournament is complete (should set status to FINISHED)
				if (testTournament.isRoundComplete())
					testTournament._advanceToNextRound();
			}
		}

		// Get the bracket using the existing method
		const	bracket = tournamentManager.getTournamentBracket(testTournament.id);

		return (reply.code(200).send(bracket));
	}
	catch (err)
	{
		console.error('[PONG] Error in testGetTournament controller:', err);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}