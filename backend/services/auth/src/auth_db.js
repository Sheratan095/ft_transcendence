import sqlite3 from "sqlite3";

import { v4 as uuidv4 } from 'uuid';

import { promisify } from "util";
import { mkdir } from "fs/promises";
import {formatExpirationDate} from "./auth_help.js";
import path from "path";

export class AuthDatabase
{
	constructor(dbPath = "./data/auth.db")
	{
		this.dbPath = dbPath;
		this.db = null;
	}

	async	initialize()
	{
		try {
			// Create data directory if it doesn't exist
			const	dir = path.dirname(this.dbPath);
			await mkdir(dir, { recursive: true });

			// Open database connection
			this.db = new sqlite3.Database(this.dbPath);
			
			// Promisify database methods for easier async/await usage
			this.db.run = promisify(this.db.run).bind(this.db);
			this.db.get = promisify(this.db.get).bind(this.db);
			this.db.all = promisify(this.db.all).bind(this.db);

			await this.#createTables();

			console.log("✅ AUTH Database connected: ", this.dbPath);
		}
		catch (error)
		{
			console.error("❌ Database initialization error:", error);
			throw (error);
		}
	}

	// Private method (#) to create tables
	async	#createTables()
	{
		// TO DO remove it - Drop tables in correct order (child first due to foreign key)
		await this.db.run('DROP TABLE IF EXISTS refresh_tokens');
		await this.db.run('DROP TABLE IF EXISTS users');

		// Create users table
		await this.db.run(`
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				email TEXT UNIQUE NOT NULL,
				username TEXT UNIQUE NOT NULL,
				password TEXT NOT NULL,
				created_at TEXT DEFAULT (datetime('now')),
				updated_at TEXT DEFAULT (datetime('now'))
			)
		`);

		// Create refresh_tokens table
		await this.db.run(`
			CREATE TABLE IF NOT EXISTS refresh_tokens (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				refresh_token TEXT NOT NULL,
				created_at TEXT DEFAULT (datetime('now')),
				expires_at TEXT NOT NULL,
				FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
			)
		`);
	}

	// TO DO check it
	// Make sure the generated UUID is unique, this chance is very low but possible
	async	#generateUUID()
	{
		const	id = uuidv4();
		// while (await this.db.get("SELECT id FROM users WHERE id = ?", [id]))
		// 	id = uuidv4();

		return (id);
	}

  // -------- USERS METHODS --------

	// Return the created user object
	async	createUser(username, password, email)
	{
		const	id = await this.#generateUUID();

		await this.db.run("INSERT INTO users (id, username, password, email) VALUES (?, ?, ?, ?)", [id, username, password, email]);

		return (await this.db.get("SELECT * FROM users WHERE id = ?", [id]));
	}

	async getAllUsers()
	{
		return (await this.db.all("SELECT * FROM users"));
	}

	async getUserByUsername(username)
	{
		return (await this.db.get("SELECT * FROM users WHERE username = ?", [username]));
	}

	// Get user by username OR email
	async getUserByUsernameOrEmail(identifier)
	{
		return (await this.db.get("SELECT * FROM users WHERE username = ? OR email = ?", [identifier, identifier]));
	}

	async deleteUserById(userId)
	{
		await this.db.run("DELETE FROM users WHERE id = ?", [userId]);
	}

	// -------- REFRESH TOKENS METHODS --------

	// expiresAt: Date object
	async	insertRefreshToken(userId, refresh_token, expiresAt)
	{
		const	id = uuidv4();

		// Convert Date object to SQLite datetime format: 'YYYY-MM-DD HH:MM:SS'
		const	expiresAtStr = formatExpirationDate(expiresAt);

		await this.db.run(
			"INSERT INTO refresh_tokens (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)",
			[id, userId, refresh_token, expiresAtStr]
		);

		return (id);
	}

	// expiresAt: Date object
	async	updateRefreshToken(userId, new_refresh_token, expiresAt)
	{
		const	expiresAtStr = formatExpirationDate(expiresAt);

		await this.db.run(
			"UPDATE refresh_tokens SET refresh_token = ?, expires_at = ?, created_at = datetime('now') WHERE user_id = ?",
			[new_refresh_token, expiresAtStr, userId]
		);
	}

	async	getTokens()
	{
		return (await this.db.all("SELECT * FROM refresh_tokens"));
	}

	async	deleteRefreshToken(tokenId, userId, refresh_token)
	{
		await this.db.run("DELETE FROM refresh_tokens WHERE id = ? AND user_id = ? AND refresh_token = ?", [tokenId, userId, refresh_token]);
	}

	async close()
	{
		if (this.db)
		{
			this.db.close();
			this.db = null;
		}
	}
}

