import sqlite3 from "sqlite3";

import { v4 as uuidv4 } from 'uuid';

import { promisify } from "util";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

export class UsersDatabase
{
	constructor(dbPath = "./data/users.db")
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
			this.db.run = promisify(this.db.run).bind(this.db);
			this.db.get = promisify(this.db.get).bind(this.db);
			this.db.all = promisify(this.db.all).bind(this.db);

			await this.#createTables();

			console.log("✅ USERS Database connected: ", this.dbPath);
		}
		catch (error)
		{
			console.error("❌ USERS Database initialization error:", error);
			throw (error);
		}
	}

	// Private method (#) to create tables
	async	#createTables()
	{
		try
		{
			// Get the directory name of the current module
			const	__filename = fileURLToPath(import.meta.url);
			const	__dirname = path.dirname(__filename);
			const	schemaPath = path.join(__dirname, 'schema.sql');

			// Read the SQL schema file
			const	schema = await readFile(schemaPath, 'utf8');

			// Split the schema into individual statements and execute them
			const	statements = schema
				.split(';')
				.map(stmt => stmt.trim())
				.filter(stmt => stmt.length > 0);

			for (const statement of statements)
				await this.db.run(statement);
		}
		catch (error)
		{
			console.error("❌ Error creating tables for USERS db:", error);

			throw (error);
		}
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

	async	#close()
	{
		if (this.db)
		{
			this.db.close();
			this.db = null;
		}
	}

  // -------- USERS METHODS --------

	// Return the created profile object
	async	createUserProfile(userId, username)
	{
		const	query = `INSERT INTO users (id, username) VALUES (?, ?)`;
		
		// Store username in lowercase for consistency
		const	lowercaseUsername = username.toLowerCase();

		await this.db.run(query, [userId, lowercaseUsername]);

		return (await this.db.get("SELECT * FROM users WHERE id = ?", [userId]));
	}

	// Get user profile by username
	async	getUserByUsername(username)
	{
		const	query = `SELECT * FROM users WHERE username = ?`;
		// Convert to lowercase for consistent querying
		return (await this.db.get(query, [username.toLowerCase()]));
	}

	async	getUserById(userId)
	{
		const	query = `SELECT * FROM users WHERE id = ?`;
		return (await this.db.get(query, [userId]));
	}

	async	getAllUsers()
	{
		const	query = `SELECT * FROM users`;
		return (await this.db.all(query));
	}

	async	updateUser(userId, newUsername, newLanguage)
	{
		console.log('Database updateUser called with:', { userId, newUsername, newLanguage });
		
		// Check if user exists first
		const existingUser = await this.getUserById(userId);
		if (!existingUser) {
			throw new Error('User not found');
		}

		// Update username if provided
		if (newUsername !== undefined && newUsername !== null && newUsername !== '') {
			const	query = `UPDATE users SET username = ? WHERE id = ?`;
			await this.db.run(query, [newUsername.toLowerCase(), userId]);
			console.log('Username updated to:', newUsername.toLowerCase());
		}
		
		// Update language if provided
		if (newLanguage !== undefined && newLanguage !== null && newLanguage !== '') {
			const	query = `UPDATE users SET language = ? WHERE id = ?`;
			await this.db.run(query, [newLanguage, userId]);
			console.log('Language updated to:', newLanguage);
		}

		// Return the updated user
		const updatedUser = await this.getUserById(userId);
		console.log('Updated user from DB:', updatedUser);
		return updatedUser;
	}
}

