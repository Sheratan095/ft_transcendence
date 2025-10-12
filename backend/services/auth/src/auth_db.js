import sqlite3 from "sqlite3";
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
	async #createTables()
	{
		await this.db.run(`
			CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				username TEXT UNIQUE,
				password TEXT
			)
		`);
	}

  // -------- CRUD METHODS --------

	async createUser(username, password)
	{
		const result = await this.db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password]);
		return (result.lastID);
	}

	async getUserByUsername(username)
	{
		return (await this.db.get("SELECT * FROM users WHERE username = ?", [username]));
	}

	async close()
	{
		if (this.db) {
			this.db.close();
			this.db = null;
		}
	}
}

