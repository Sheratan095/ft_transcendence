import sqlite3 from "sqlite3";

import { v4 as uuidv4 } from 'uuid';

import { promisify } from "util";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

// Get the directory name of the current module for later use
const	__filename = fileURLToPath(import.meta.url);
const	__dirname = path.dirname(__filename);

export class	ChatDatabase
{
	constructor(dbPath = "./data/chat.db")
	{
		this.dbPath = dbPath;
		this.db = null;
		this.systemSenderId = 'system';
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

			console.log("[CHAT] Database connected: ", this.dbPath);
		}
		catch (error)
		{
			console.error("[CHAT] Database initialization error:", error);
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

					console.log("[CHAT] Table creation info:", err.message);
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

	async	#close()
	{
		if (this.db)
		{
			this.db.close();
			this.db = null;
		}
	}

	//-----------------------------CHAT QUERIES----------------------------

	async	getChatsByUserId(userId)
	{
		// Get all chats for the user with all members
		const	query = `
			SELECT 
				c.id as chat_id,
				c.name,
				c.chat_type,
				c.created_at,
				cm.user_id,
				cm.joined_at
			FROM chats c
			INNER JOIN chat_members cm ON c.id = cm.chat_id
			WHERE c.id IN (
				SELECT chat_id 
				FROM chat_members 
				WHERE user_id = ?
			)
			ORDER BY c.created_at DESC
		`;

		const	chats = await this.db.all(query, [userId]);
		return (chats);
	}

	async	getChatsForUser(userId)
	{
		const	query = `
			SELECT 
				c.id as chat_id,
				c.name,
				c.chat_type,
				c.created_at
			FROM chats c
			INNER JOIN chat_members cm ON c.id = cm.chat_id
			WHERE cm.user_id = ?
			ORDER BY c.created_at DESC
		`;

		const	chats = await this.db.all(query, [userId]);
		return (chats);
	}

	// Fetch just the messages for a chat that a user is part of and that he has received
	//	system messages are included
	async	getMessagesByChatIdForUser(chatId, userId, limit = 50, offset = 0)
	{
		const query = `
			SELECT 
				m.id,
				m.chat_id,
				m.sender_id,
				m.content,
				m.created_at,
				COALESCE(ms.status, 'system') AS message_status
			FROM messages m
			LEFT JOIN message_statuses ms 
				ON m.id = ms.message_id AND ms.user_id = ?
			WHERE m.chat_id = ?
			AND (ms.user_id = ? OR m.sender_id = ?)
			ORDER BY m.created_at DESC
			LIMIT ? OFFSET ?;
		`;
		// Fetch all messages in the chat received by the user (exclude messages before join and after leave)
		// Include messages sent by the user as well
		// Include system messages (sender_id = 'system') regardless of message_statuses

		const	messages = await this.db.all(query, [userId, chatId, userId, this.systemSenderId, limit, offset]);
		return (messages);
	}

	async	getUsersInRoom(chatId)
	{
		const	query = `
			SELECT user_id
			FROM chat_members
			WHERE chat_id = ?
		`;

		const	users = await this.db.all(query, [chatId]);
		return (users.map(u => u.user_id));
	}

	async	createPrivateChat(userId1, userId2)
	{
		// Check if a private chat already exists between these two users
		const	existingChatQuery = `
			SELECT chats.id
			FROM chats
			JOIN chat_members cm1 ON chats.id = cm1.chat_id AND cm1.user_id = ?
			JOIN chat_members cm2 ON chats.id = cm2.chat_id AND cm2.user_id = ?
			WHERE chats.chat_type = 'dm'
		`;

		const	existingChat = await this.db.get(existingChatQuery, [userId1, userId2]);
		if (existingChat)
			return (existingChat.id);

		// Create new private chat
		const	chatId = await this.#generateUUID();
		const	insertChatQuery = `
			INSERT INTO chats (id, name, chat_type)
			VALUES (?, 'dm', 'dm')
		`;

		await this.db.run(insertChatQuery, [chatId]);

		// Add both users to the chat_members table
		const insertMemberQuery = `
			INSERT INTO chat_members (chat_id, user_id)
			VALUES (?, ?)
		`;

		await this.db.run(insertMemberQuery, [chatId, userId1]);
		await this.db.run(insertMemberQuery, [chatId, userId2]);

		return (chatId);
	}

	async	createGroupChat(name)
	{
		// Create new group chat
		const	chatId = await this.#generateUUID();

		const	insertChatQuery = `
			INSERT INTO chats (id, name, chat_type)
			VALUES (?, ?, 'group')
		`;

		await this.db.run(insertChatQuery, [chatId, name]);

		return (chatId);
	}

	async	chatExists(chatId)
	{
		const	query = `
			SELECT COUNT(*) as count
			FROM chats
			WHERE id = ?
		`;

		const	result = await this.db.get(query, [chatId]);
		return (result.count > 0);
	}

	// CHECK:
	//	if chat exist
	//	if type is group
	async	isUserInChat(userId, chatId)
	{
		const	query = `
			SELECT COUNT(*) as count
			FROM chat_members
			WHERE chat_id = ? AND user_id = ?
		`;

		const	result = await this.db.get(query, [chatId, userId]);
		return (result.count > 0);
	}

	async	getChatType(chatId)
	{
		const	query = `
			SELECT chat_type
			FROM chats
			WHERE id = ?
		`;

		const	result = await this.db.get(query, [chatId]);
		return (result ? result.chat_type : null);
	}

	async	addUserToChat(chatId, userId)
	{
		// Check if user is already in chat
		if (await this.isUserInChat(userId, chatId))
		{
			const error = new Error('User is already a member of this chat');
			error.code = 'USER_ALREADY_IN_CHAT';
			throw error;
		}

		// Check if the chat is group chat
		const	chatTypeQuery = `
			SELECT chat_type
			FROM chats
			WHERE id = ?
		`;

		const	chat = await this.db.get(chatTypeQuery, [chatId]);
		if (!chat || chat.chat_type !== 'group')
		{
			const error = new Error('Can only add users to group chats');
			error.code = 'CHAT_NOT_GROUP_TYPE';
			throw error;
		}

		const	insertMemberQuery = `
			INSERT INTO chat_members (chat_id, user_id)
			VALUES (?, ?)
		`;

		await this.db.run(insertMemberQuery, [chatId, userId]);
	}

	async	getChatById(chatId)
	{
		const	query = `
			SELECT 
				id,
				name,
				chat_type,
				created_at
			FROM chats
			WHERE id = ?
		`;

		const	chat = await this.db.get(query, [chatId]);
		return (chat);
	}

	//-----------------------------MESSAGE QUERIES----------------------------

	async	addMessageToChat(chatId, senderId, message)
	{
		const	messageId = await this.#generateUUID();
		const	timestamp = new Date().toISOString();

		const	insertMessageQuery = `
			INSERT INTO messages (id, chat_id, sender_id, content, created_at)
			VALUES (?, ?, ?, ?, ?)
		`;

		await this.db.run(insertMessageQuery, [messageId, chatId, senderId, message, timestamp]);

		return (messageId);
	}

	async	addSystemMessageToChat(chatId, message)
	{
		const	messageId = await this.#generateUUID();
		const	timestamp = new Date().toISOString();

		const	insertMessageQuery = `
			INSERT INTO messages (id, chat_id, sender_id, content, created_at)
			VALUES (?, ?, ?, ?, ?)
		`;

		await this.db.run(insertMessageQuery, [messageId, chatId, this.systemSenderId, message, timestamp]);

		return (messageId);
	}

	//-----------------------------MESSAGE STATUS QUERIES----------------------------

	async	updateMessageStatus(messageId, userId, status)
	{
		const	timestamp = new Date().toISOString();

		// Update existing status entry
		const	updateStatusQuery = `
			UPDATE message_statuses
			SET status = ?, updated_at = ?
			WHERE message_id = ? AND user_id = ?
		`;
		await this.db.run(updateStatusQuery, [status, timestamp, messageId, userId]);
	}

	async	createMessageStatus(messageId, userId, status)
	{
		const	timestamp = new Date().toISOString();

		const	insertStatusQuery = `
			INSERT INTO message_statuses (message_id, user_id, status, updated_at)
			VALUES (?, ?, ?, ?)
		`;

		await this.db.run(insertStatusQuery, [messageId, userId, status, timestamp]);
	}

	async	getUndeliveredMessages(userId)
	{
		const	query = `
			SELECT m.id as message_id, m.chat_id, m.sender_id, m.content, m.created_at
			FROM messages m
			JOIN chat_members cm ON m.chat_id = cm.chat_id
			LEFT JOIN message_statuses ms ON m.id = ms.message_id AND ms.user_id = ?
			WHERE cm.user_id = ? AND ms.status = 'sent'
			ORDER BY m.created_at ASC
		`;

		const	messages = await this.db.all(query, [userId, userId]);
		return (messages);
	}

	// Returns aggregated status for a message across all recipients (excluding sender)
	// DELIVERED if it's delivered to all recipients
	// READ if it's read by all recipients
	// Return "sent" if at least one recipient has not received it yet OR in case of error
	async	getOverallMessageStatus(messageId)
	{
		try
		{
			const query = `
				SELECT 
					MIN(ms.status) AS min_status,
					MAX(ms.status) AS max_status
				FROM message_statuses ms
				JOIN messages m ON ms.message_id = m.id
				WHERE ms.message_id = ?
				AND ms.user_id != m.sender_id
			`;

			const	row = await this.db.get(query, [messageId]);

			// The message HAS TO BE A SENDER that VISUALIZE THE MESSAGE
			//	so, if there are no rows, it means there are no recipients (e.g., only the sender exists)
			if (!row || row.min_status === null)
				return ("read");

			const	{ min_status, max_status } = row;

			// ---- AGGREGATION LOGIC ----

			// All read
			if (min_status === "read" && max_status === "read")
				return ("read");

			// All delivered
			if (min_status === "delivered" && max_status === "delivered")
				return ("delivered");

			// Otherwise: at least one recipient still has only "sent"
			return ("sent");
		}
		catch (err)
		{
			console.error("[CHATDB] Failed to compute overall message status:", err);
			return ("sent");
		}
	}

	async	markMessagesAsRead(chatId, userId)
	{
		const	timestamp = new Date().toISOString();

		const	query = `
			UPDATE message_statuses
			SET status = 'read', 
				updated_at = ?
			WHERE user_id = ?
			AND message_id IN (
				SELECT id FROM messages WHERE chat_id = ?
			)
			AND status != 'read'
		`;
		// Using IN clause because SQLite doesn't support JOINs in UPDATE statements directly

		await this.db.run(query, [timestamp, userId, chatId]);

		return (timestamp);
	}

	// Used when a user fetch messages from a chat
	async	markMessagesAsDelivered(chatId, userId)
	{
		const	timestamp = new Date().toISOString();

		const	query = `
			UPDATE message_statuses
			SET status = 'delivered', 
				updated_at = ?
			WHERE user_id = ?
			AND message_id IN (
				SELECT id FROM messages WHERE chat_id = ?
			)
			AND status != 'read'
		`;
		// Using IN clause because SQLite doesn't support JOINs in UPDATE statements directly

		await this.db.run(query, [timestamp, userId, chatId]);

		return (timestamp);
	}

	async	getMessagesUpdatedAt(chatId, timestamp)
	{
		const	query = `
			SELECT message_id, sender_id
			FROM message_statuses ms
			JOIN messages m ON m.id = ms.message_id
			WHERE m.chat_id = ? AND ms.updated_at = ?
		`;

		return (this.db.all(query, [chatId, timestamp]));
	}
}