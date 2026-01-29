import sqlite3 from "sqlite3";
import { promisify } from "util";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

// Get the directory name of the current module for later use
const	__filename = fileURLToPath(import.meta.url);
const	__dirname = path.dirname(__filename);

export class	UsersDatabase
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
			const run = promisify(this.db.run.bind(this.db));
			const get = promisify(this.db.get.bind(this.db));
			const all = promisify(this.db.all.bind(this.db));
			
			this.db.run = run;
			this.db.get = get;
			this.db.all = all;

			await this.#createTables();

			console.log("[USERS] Database connected: ", this.dbPath);
		}
		catch (error)
		{
			console.log("[USERS] Database initialization error:", error);
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

					console.log("[USERS] Table creation info:", err.message);
				}
			}
		}
		catch (error)
		{
			console.log("❌ Error reading schema for USERS db:", error);
			throw (error);
		}
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

	async	deleteUserById(userId)
	{
		const	query = `UPDATE users SET deleted = 1, username = ?, avatar_url = NULL WHERE id = ?`;

		const	anonymousUsername = process.env.PLACEHOLDER_DELETED_USERNAMES;

		await this.db.run(query, [anonymousUsername.toLowerCase(), userId]);
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

	async	searchUsers(searchQuery)
	{
		const	likeQuery = `${searchQuery.toLowerCase()}%`;

		const query = `
			SELECT id, username, avatar_url
			FROM users
			WHERE LOWER(username) LIKE ?
				AND deleted = 0
			ORDER BY username ASC
			LIMIT 20;
		`;

		return (await this.db.all(query, [likeQuery]));
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

	async	getTotalUserCount()
	{
		const	query = `SELECT COUNT(*) AS count FROM users`;
		const	row = await this.db.get(query);

		return (row.count);
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

	// Get all relationships for a user
	async	getRelationships(userId)
	{
		const	relationships = await this.db.all(`
			SELECT 
				CASE 
					WHEN ur.requester_id = ? THEN ur.target_id 
					ELSE ur.requester_id 
				END AS userId,
				u.username AS username,
				ur.relationship_status AS relationship_status,
				ur.created_at AS created_at,
				ur.updated_at AS updated_at
			FROM user_relationships ur
			JOIN users u ON (u.id = ur.requester_id OR u.id = ur.target_id)
			WHERE (ur.requester_id = ? OR ur.target_id = ?)
			AND u.id != ?
		`, [userId, userId, userId, userId]);

		return (relationships);
	}

	async	getUsersRelationship(userA, userB)
	{
		const	query =`
			SELECT * FROM user_relationships
			WHERE (requester_id = ? AND target_id = ?) OR (requester_id = ? AND target_id = ?)`;

		const	relationship = await this.db.get(query, [userA, userB, userB, userA]);


		return (relationship);
	}

	// Get only accepted friends
	async	getFriends(userId)
	{
		const	friends = await this.db.all(`
			SELECT 
				CASE 
					WHEN ur.requester_id = ? THEN ur.target_id 
					ELSE ur.requester_id 
				END AS userId,
				u.username,
				u.language,
				u.avatar_url,
				ur.updated_at AS friends_since
			FROM user_relationships ur
			JOIN users u ON (u.id = ur.requester_id OR u.id = ur.target_id)
			WHERE ur.relationship_status = 'accepted'
			AND (ur.requester_id = ? OR ur.target_id = ?)
			AND u.id != ?
		`, [userId, userId, userId, userId]);

		return (friends);
	}

	// Get incoming friend requests (someone sent request TO userId)
	//	userId is the target
	async	getIncomingRequests(userId)
	{
		const	requests = await this.db.all(`
			SELECT 
				ur.requester_id AS userId,
				u.username,
				ur.created_at
			FROM user_relationships ur
			JOIN users u ON u.id = ur.requester_id
			WHERE ur.relationship_status = 'pending'
			AND ur.target_id = ?
		`, [userId]);

		return (requests);
	}

	// Get outgoing friend requests (userId sent request TO someone)
	//	userId is the requester
	async	getOutgoingRequests(userId)
	{
		const	requests = await this.db.all(`
			SELECT 
				ur.target_id AS userId,
				u.username,
				ur.created_at
			FROM user_relationships ur
			JOIN users u ON u.id = ur.target_id
			WHERE ur.relationship_status = 'pending'
			AND ur.requester_id = ?
		`, [userId]);

		return (requests);
	}

	// Check if either direction is blocked
	async	isBlocked(userA, userB)
	{
		const	row = await this.db.get(`
			SELECT 1
			FROM user_relationships
			WHERE ((requester_id = ? AND target_id = ?) OR (requester_id = ? AND target_id = ?))
			AND relationship_status = 'blocked'
		`, [userA, userB, userB, userA]);

		return (!!row); // true if blocked
	}

	// Create or update a friend request
	// Returns: 'sent' | 'mutual_accept' to inform controller what happened
	async	sendFriendRequest(senderId, receiverId)
	{
		// Check if relationship already exists (either direction)
		const	existing = await this.db.get(`
			SELECT relationship_status, requester_id, target_id
			FROM user_relationships
			WHERE (requester_id = ? AND target_id = ?) OR (requester_id = ? AND target_id = ?)
		`, [senderId, receiverId, receiverId, senderId]);

		// ALL EXCEPTIONS ARE CATCHED AND HANDLED IN CONTROLLER
		if (existing)
		{
			// If blocked, don't allow friend requests
			if (existing.relationship_status === 'blocked')
				throw (new Error('Cannot send friend request to blocked user'));
			
			// If already friends
			if (existing.relationship_status === 'accepted')
				throw (new Error('Already friends'));
			
			// If there's already a pending request from this sender
			if (existing.relationship_status === 'pending' && existing.requester_id === senderId)
				throw (new Error('Friend request already sent'));
			
			// If there's a pending request from the other user, accept it automatically
			if (existing.relationship_status === 'pending' && existing.requester_id === receiverId)
			{
				await this.db.run(`
					UPDATE user_relationships
					SET relationship_status = 'accepted', updated_at = CURRENT_TIMESTAMP
					WHERE requester_id = ? AND target_id = ?
				`, [receiverId, senderId]);
				return 'mutual_accept';
			}
			
			// If rejected, allow resending by updating to pending
			// Delete the old rejected relationship and create a new pending one with correct direction
			if (existing.relationship_status === 'rejected')
			{
				await this.db.run(`
					DELETE FROM user_relationships
					WHERE (requester_id = ? AND target_id = ?) OR (requester_id = ? AND target_id = ?)
				`, [senderId, receiverId, receiverId, senderId]);
				
				await this.db.run(`
					INSERT INTO user_relationships (requester_id, target_id, relationship_status)
					VALUES (?, ?, 'pending')
				`, [senderId, receiverId]);
				
				return 'sent';
			}
		}
		else
		{
			// Create new relationship
			await this.db.run(`
				INSERT INTO user_relationships (requester_id, target_id, relationship_status)
				VALUES (?, ?, 'pending')
			`, [senderId, receiverId]);
		}
		
		return 'sent';
	}

	// Accept a pending request (only the target can accept)
	async	acceptFriendRequest(userId, requesterId)
	{
		// First check if there's a pending request where userId is the target
		const	pendingRequest = await this.db.get(`
			SELECT 1 FROM user_relationships
			WHERE requester_id = ? AND target_id = ?
			AND relationship_status = 'pending'
		`, [requesterId, userId]);

		if (!pendingRequest)
			throw (new Error('No pending friend request found'));

		// Update the relationship status
		await this.db.run(`
			UPDATE user_relationships
			SET relationship_status = 'accepted', updated_at = CURRENT_TIMESTAMP
			WHERE requester_id = ? AND target_id = ?
			AND relationship_status = 'pending'
		`, [requesterId, userId]);
	}

	// Reject a pending request (only the target can reject)
	async	rejectFriendRequest(userId, requesterId)
	{
		// First check if there's a pending request where userId is the target
		const	pendingRequest = await this.db.get(`
			SELECT 1 FROM user_relationships
			WHERE requester_id = ? AND target_id = ?
			AND relationship_status = 'pending'
		`, [requesterId, userId]);

		if (!pendingRequest)
			throw new Error('No pending friend request found');

		// Update the relationship status
		await this.db.run(`
			UPDATE user_relationships
			SET relationship_status = 'rejected', updated_at = CURRENT_TIMESTAMP
			WHERE requester_id = ? AND target_id = ?
			AND relationship_status = 'pending'
		`, [requesterId, userId]);
	}

	// Block a user
	async	blockUser(blockerId, blockedId)
	{
		// Check if relationship exists (either direction)
		const	existing = await this.db.get(`
			SELECT relationship_status, requester_id, target_id
			FROM user_relationships
			WHERE (requester_id = ? AND target_id = ?) OR (requester_id = ? AND target_id = ?)
		`, [blockerId, blockedId, blockedId, blockerId]);

		if (existing)
		{
			// Delete the existing relationship and create a new blocked relationship
			await this.db.run(`
				DELETE FROM user_relationships
				WHERE (requester_id = ? AND target_id = ?) OR (requester_id = ? AND target_id = ?)
			`, [blockerId, blockedId, blockedId, blockerId]);
		}

		// Create new blocked relationship (blocker is always the requester)
		await this.db.run(`
			INSERT OR REPLACE INTO user_relationships (requester_id, target_id, relationship_status)
			VALUES (?, ?, 'blocked')
		`, [blockerId, blockedId]);
	}

	// Unblock a user (only the blocker can unblock)
	//	targetId is the blocked user
	async	unblockUser(userId, targetId)
	{
		await this.db.run(`
			DELETE FROM user_relationships
			WHERE requester_id = ? AND target_id = ?
			AND relationship_status = 'blocked'
		`, [userId, targetId]);
	}

	// Cancel outgoing friend request (only requester can cancel)
	async	cancelFriendRequest(userId, targetId)
	{
		// First check if there's a pending request where userId is the requester
		const	pendingRequest = await this.db.get(`
			SELECT 1 FROM user_relationships
			WHERE requester_id = ? AND target_id = ?
			AND relationship_status = 'pending'
		`, [userId, targetId]);

		if (!pendingRequest)
			throw (new Error('No outgoing friend request found to cancel'));

		// Delete the relationship
		await this.db.run(`
			DELETE FROM user_relationships
			WHERE requester_id = ? AND target_id = ?
			AND relationship_status = 'pending'
		`, [userId, targetId]);
	}

	// Remove friend / delete relationship (works in both directions)
	async	removeFriend(userId, friendId)
	{
		await this.db.run(`
			DELETE FROM user_relationships
			WHERE (requester_id = ? AND target_id = ?) OR (requester_id = ? AND target_id = ?)
			AND relationship_status = 'accepted'
		`, [userId, friendId, friendId, userId]);
	}

	async	deleteUserRelationships(userId)
	{
		await this.db.run(`
			DELETE FROM user_relationships
			WHERE requester_id = ? OR target_id = ?
		`, [userId, userId]);
	}
}
