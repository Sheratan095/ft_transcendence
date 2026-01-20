import sqlite3 from "sqlite3";

import { v4 as uuidv4 } from 'uuid';

import { promisify } from "util";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

// Get the directory name of the current module for later use
const	__filename = fileURLToPath(import.meta.url);
const	__dirname = path.dirname(__filename);

export class	PongDatabase
{
	constructor(dbPath = "./data/pong.db")
	{
		this.dbPath = dbPath;
		this.db = null;
	}

	async	initialize()
	{
		try
		{
			// Create data directory if it doesn't exist
			const	dir = path.dirname(this.dbPath);
			await mkdir(dir, { recursive: true });

			// Open database connection
			this.db = new sqlite3.Database(this.dbPath);
			
			// Promisify database methods for easier async/await usage
			const run = promisify(this.db.run.bind(this.db));
			const get = promisify(this.db.get.bind(this.db));
			const all = promisify(this.db.all.bind(this.db));
			
			this.db.run = run;
			this.db.get = get;
			this.db.all = all;

			await this.#createTables();

			console.log("[PONG] Database connected: ", this.dbPath);
		}
		catch (error)
		{
			console.error("[PONG] Database initialization error:", error);
			throw (error);
		}
	}

	async	#createTables()
	{
		try
		{
			const	schemaPath = path.join(__dirname, 'schema.sql');

			// Read the SQL schema file
			const	schema = await readFile(schemaPath, 'utf8');

			// Split the schema into individual statements and execute them
			const	statements = schema
				.split(';')
				.map(stmt => stmt.trim())
				.filter(stmt => stmt.length > 0);

			for (const statement of statements)
			{
				try
				{
					await this.db.run(statement);
				}
				catch (err)
				{
					// Silently ignore errors if tables already exist
					if (err.message.includes('SQLITE_MISUSE') || err.message.includes('already exists') || err.message.includes('UNIQUE constraint failed'))
						continue;

					console.log("[PONG] Table creation info:", err.message);
				}
			}
		}
		catch (error)
		{
			console.log("❌ Error reading schema for USERS db:", error);
			throw (error);
		}
	}

	async	#generateUUID()
	{
		const	id = uuidv4();

		return (id);
	}

	//-----------------------------MATCHES QUERIES---------------------------------//

	// When a user is deleted, his name musn't appear in past matches, it will be "Deleted User" or something like that
	async	getMatchesForUser(userId)
	{
		const	query = `
			SELECT *
			FROM matches
			WHERE player_left_id = ? OR player_right_id = ?
		`;
		const	matches = await this.db.all(query, [userId, userId]);

		return (matches);
	}

	// Ended at datetime is set by default to CURRENT_TIMESTAMP from db
	async	saveMatch(playerLeftId, playerRightId, playerLeftScore, playerRightScore, winnerId)
	{
		const	matchId = await this.#generateUUID();
		const	query = `
			INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id)
			VALUES (?, ?, ?, ?, ?, ?)
		`;

		await this.db.run(query, [matchId, playerLeftId, playerRightId, playerLeftScore, playerRightScore, winnerId]);
		return (matchId);
	}

	async	getMatchById(matchId)
	{
		const	query = `
			SELECT *
			FROM matches
			WHERE id = ?
		`;
		const	match = await this.db.get(query, [matchId]);

		return (match);
	}

	async	getMatchesForUser(userId)
	{
		const	query = `
			SELECT *
			FROM matches
			WHERE player_left_id = ? OR player_right_id = ?
		`;
		const	matches = await this.db.all(query, [userId, userId]);

		return (matches);
	}

	//-----------------------------USER STATS QUERIES---------------------------------//

	// Called by auth service when a new user is created
	async	createUserStats(userId)
	{
		const	query = `
			INSERT INTO user_stats (user_id)
			VALUES (?)
		`;

		await this.db.run(query, [userId]);
	}

	// Called by auth service when a user is deleted (GDPR compliance)
	async	deleteUserStats(userId)
	{
		const	query = `
			DELETE FROM user_stats
			WHERE user_id = ?
		`;

		await this.db.run(query, [userId]);
	}

	// TEXT ELO is added in controller level beacause it's a business logic not a db logic
	async	getUserStats(userId)
	{
		const	query = `
			SELECT *
			FROM user_stats
			WHERE user_id = ?
		`;
		const	stats = await this.db.get(query, [userId]);

		return (stats);
	}

	async	updateUserStats(userId, winsDelta = 0, lossesDelta = 0, tournamentWinsDelta = 0, tournamentsParticipatedDelta = 0)
	{
		const	query = `
			UPDATE user_stats
			SET
				wins = wins + ?,
				losses = losses + ?,
				tournament_wins = tournament_wins + ?,
				tournaments_participated = tournaments_participated + ?
			WHERE user_id = ?
		`;

		await this.db.run(query, [winsDelta, lossesDelta, tournamentWinsDelta, tournamentsParticipatedDelta, userId]);
	}

	//-----------------------------TOURNAMENT QUERIES---------------------------------//

	async	saveTournament(tournamentId, name, creatorId, winnerId)
	{
		const	query = `
			INSERT INTO tournaments (id, name, creator_id, winner_id)
			VALUES (?, ?, ?, ?)
		`;

		await this.db.run(query, [tournamentId, name, creatorId, winnerId]);
	}

	async	saveTournamentParticipants(tournamentId, participants)
	{
		const	query = `
			INSERT INTO tournament_participants (tournament_id, user_id)
			VALUES (?, ?)
		`;

		// Insert all participants
		for (const participant of participants)
			await this.db.run(query, [tournamentId, participant.userId]);
	}

	async	getTournamentParticipationByUser(userId)
	{
		const	query = `
			SELECT tp.tournament_id, t.name,t.finished_at
			FROM tournament_participants tp
			JOIN tournaments t ON tp.tournament_id = t.id
			WHERE tp.user_id = ?
			ORDER BY tp.finished_at DESC
		`;

		const	participation = await this.db.all(query, [userId]);
		return (participation);
	}

	async	updateTournamentParticipantTop(tournamentId, userId, top)
	{
		const	query = `
			UPDATE tournament_participants
			SET top = ?
			WHERE tournament_id = ? AND user_id = ?
		`;

		await this.db.run(query, [top, tournamentId, userId]);
	}

	//-----------------------------CLOSE DB---------------------------------//

	async	#close()
	{
		if (this.db)
		{
			this.db.close();
			this.db = null;
		}
	}
}