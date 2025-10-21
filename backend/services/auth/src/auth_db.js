import sqlite3 from "sqlite3";

import { v4 as uuidv4 } from 'uuid';

import { promisify } from "util";
import { mkdir, readFile } from "fs/promises";
import {formatExpirationDate} from "./auth_help.js";
import path from "path";
import { fileURLToPath } from 'url';

export class AuthDatabase
{
	constructor(dbPath = "./data/auth.db")
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
			console.error("❌ Error creating tables for auth_db:", error);

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

	// Return the created user object
	async	createUser(username, password, email)
	{
		const	id = await this.#generateUUID();

		await this.db.run("INSERT INTO users (id, username, password, email) VALUES (?, ?, ?, ?)", [id, username, password, email]);

		return (await this.db.get("SELECT * FROM users WHERE id = ?", [id]));
	}

	async	getAllUsers()
	{
		return (await this.db.all("SELECT * FROM users"));
	}

	async	getUserByUsername(username)
	{
		return (await this.db.get("SELECT * FROM users WHERE username = ?", [username]));
	}

	async	getUserById(userId)
	{
		return (await this.db.get("SELECT * FROM users WHERE id = ?", [userId]));
	}

	// Get user by username OR email
	async	getUserByUsernameOrEmail(identifier)
	{
		return (await this.db.get("SELECT * FROM users WHERE username = ? OR email = ?", [identifier, identifier]));
	}

	async	deleteUserById(userId)
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

	async	getRefreshTokenByUserId(userId)
	{
		return (await this.db.get("SELECT * FROM refresh_tokens WHERE user_id = ?", [userId]));
	}

	async	getRefreshTokens()
	{
		return (await this.db.all("SELECT * FROM refresh_tokens"));
	}

	async	deleteRefreshTokenById(tokenId,)
	{
		await (this.db.run("DELETE FROM refresh_tokens WHERE id = ?", [tokenId]));
	}

	// -------- TWO-FACTOR AUTH METHODS --------

	async	insertTwoFactorToken(userId, otpCode, expiresAt)
	{
		const	id = uuidv4();

		await this.db.run("INSERT INTO twofactor_tokens (id, user_id, otp_code, expires_at) VALUES (?, ?, ?, ?)", [id, userId, otpCode, expiresAt]);

		return (id);
	}

	async	getTwoFactorTokenByUserId(userId)
	{
		return (await this.db.get("SELECT * FROM twofactor_tokens WHERE user_id = ?", [userId]));
	}

	async	deleteTwoFactorTokenById(tokenId)
	{
		await (this.db.run("DELETE FROM twofactor_tokens WHERE id = ?", [tokenId]));
	}

	async	deleteTwoFactorTokenByUserId(userId)
	{
		await (this.db.run("DELETE FROM twofactor_tokens WHERE user_id = ?", [userId]));
	}

	async	getTwoFactorTokens()
	{
		return (await this.db.all("SELECT * FROM twofactor_tokens"));
	}
}

