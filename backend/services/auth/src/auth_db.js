import sqlite3 from "sqlite3";

import { v4 as uuidv4 } from 'uuid';

import { promisify } from "util";
import { mkdir } from "fs/promises";
import path from "path";

export class AuthDatabase
{
	constructor(dbPath = "./data/auth.db")
	{
		this.dbPath = dbPath;
		this.db = null;
	}

	async initialize()
	{
		try {
			// Create data directory if it doesn't exist
			const dir = path.dirname(this.dbPath);
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
		// TO DO remove it
		await this.db.run('DROP TABLE IF EXISTS users');

		await this.db.run(`
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				username TEXT UNIQUE,
				password TEXT
			);

			CREATE TABLE IF NOT EXISTS refresh_tokens (
				id TEXT PRIMARY KEY,
				user_id TEXT,
				token TEXT,
				created_at INTEGER,
				expires_at INTEGER,
				FOREIGN KEY (user_id) REFERENCES users (id)
			);
		`);

	}

	// Make sure the generated UUID is unique, this chance is very low but possible
	async	#generateUUID()
	{
		const	id = uuidv4();
		while (await this.db.get("SELECT id FROM users WHERE id = ?", [id]))
			id = uuidv4();

		return (id);
	}

  // -------- CRUD METHODS --------

	async	createUser(username, password)
	{
		const	id = await this.#generateUUID();

		await this.db.run("INSERT INTO users (id, username, password) VALUES (?, ?, ?)", [id, username, password]);

		return (id);
	}

	async getAllUsers()
	{
		return (await this.db.all("SELECT * FROM users"));
	}

	async getUserByUsername(username)
	{
		return (await this.db.get("SELECT * FROM users WHERE username = ?", [username]));
	}

	async deleteUserById(userId)
	{
		await this.db.run("DELETE FROM users WHERE id = ?", [userId]);
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

