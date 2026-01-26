import sqlite3 from "sqlite3";

import { v4 as uuidv4 } from 'uuid';

import { promisify } from "util";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

// Get the directory name of the current module for later use
const	__filename = fileURLToPath(import.meta.url);
const	__dirname = path.dirname(__filename);

export class	TrisDatabase
{
	constructor(dbPath = "./data/tris.db")
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

			console.log("[TRIS] Database connected: ", this.dbPath);
		}
		catch (error)
		{
			console.error("[TRIS] Database initialization error:", error);
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

					console.log("[TRIS] Table creation info:", err.message);
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
			WHERE player_x_id = ? OR player_o_id = ?
		`;
		const	matches = await this.db.all(query, [userId, userId]);

		return (matches);
	}

	async	saveMatch(playerXId, playerOId, winnerId)
	{
		const	matchId = await this.#generateUUID();
		const	query = `
			INSERT INTO matches (id, player_x_id, player_o_id, winner_id)
			VALUES (?, ?, ?, ?)
		`;

		await this.db.run(query, [matchId, playerXId, playerOId, winnerId]);
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
			WHERE player_x_id = ? OR player_o_id = ?
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

	async	updateUserStats(userId, winsDelta = 0, lossesDelta = 0)
	{
		const	query = `
			UPDATE user_stats
			SET
				wins = wins + ?,
				losses = losses + ?
			WHERE user_id = ?
		`;

		await this.db.run(query, [winsDelta, lossesDelta, userId]);
	}

	async	#close()
	{
		if (this.db)
		{
			this.db.close();
			this.db = null;
		}
	}
}