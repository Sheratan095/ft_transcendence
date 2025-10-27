import sqlite3 from "sqlite3";

import { v4 as uuidv4 } from 'uuid';

import { promisify } from "util";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

// Get the directory name of the current module for later use
const	__filename = fileURLToPath(import.meta.url);
const	__dirname = path.dirname(__filename);

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

			// Create avatars directory inside data folder
			const	avatarsDir = path.join(dir, 'avatars');
			await mkdir(avatarsDir, { recursive: true });

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

		// Update username if provided
		if (newUsername !== undefined && newUsername !== null && newUsername !== '')
		{
			const	query = `UPDATE users SET username = ? WHERE id = ?`;
			await this.db.run(query, [newUsername.toLowerCase(), userId]);
		}
		
		// Update language if provided
		if (newLanguage !== undefined && newLanguage !== null && newLanguage !== '')
		{
			const	query = `UPDATE users SET language = ? WHERE id = ?`;
			await this.db.run(query, [newLanguage, userId]);
		}

		// Return the updated user
		const	updatedUser = await this.getUserById(userId);

		return (updatedUser);
	}

	// -------- USER AVATAR METHODS --------

	async	updateUserAvatar(userId, avatarUrl)
	{
		const	query = `UPDATE users SET avatar_url = ? WHERE id = ?`;
		await this.db.run(query, [avatarUrl, userId]);
	}

	async	getUserAvatar(userId)
	{
		const	query = `SELECT avatar_url FROM users WHERE id = ?`;
		const	row = await this.db.get(query, [userId]);

		return (row ? row.avatar_url : null);
	}

	// -------- USER RELATIONSHIPS METHODS --------

	async	getFriends(userId)
	{
		const friends = await db.all(`
		SELECT u.*
		FROM users u
		JOIN user_relationships ur
		ON (u.id = ur.user1_id OR u.id = ur.user2_id)
		WHERE ur.relationship_status = 'accepted'
		AND (ur.user1_id = ? OR ur.user2_id = ?)
		AND u.id != ?
		`, [userId, userId, userId]);

		return (friends);
	}

	async	getPendingRequests(userId)
	{
		const requests = await db.all(`
			SELECT u.*
			FROM users u
			JOIN user_relationships ur
			ON (u.id = ur.user1_id OR u.id = ur.user2_id)
			WHERE ur.relationship_status = 'pending'
			AND (
					(ur.user1_id = u.id AND ur.user2_id = ?)
				OR (ur.user2_id = u.id AND ur.user1_id = ?)
			)
		`, [userId, userId]);

		return (requests);
	}

	async	isBlocked(userA, userB)
	{
		const	row = await db.get(`
			SELECT 1
			FROM user_relationships
			WHERE relationship_status = 'blocked'
			AND ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))
		`, [userA, userB, userB, userA]);

		return (!!row); // true if blocked
	}

	async	addFriendRequest(senderId, receiverId)
	{
		// Ensure user1_id < user2_id for the bidirectional schema
		const	[user1, user2] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];

		return await db.run(`
			INSERT INTO user_relationships (user1_id, user2_id, relationship_status)
			VALUES (?, ?, 'pending')
			ON CONFLICT(user1_id, user2_id) DO UPDATE SET relationship_status='pending', updated_at=CURRENT_TIMESTAMP
		`, [user1, user2]);
	}

	async	acceptFriendRequest(userA, userB)
	{
		const	[user1, user2] = userA < userB ? [userA, userB] : [userB, userA];

		return await db.run(`
			UPDATE user_relationships
			SET relationship_status='accepted', updated_at=CURRENT_TIMESTAMP
			WHERE user1_id = ? AND user2_id = ? AND relationship_status='pending'
		`, [user1, user2]);
	}
}
