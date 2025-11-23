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

	async	getChatUsers(chatId)
	{
		const	query = `
			SELECT users.id
			FROM chat_members
			WHERE chat_members.chat_id = ?
		`;

		const	users = await this.db.all(query, [chatId]);
		return (users);
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
			INSERT INTO chats (id, chat_type)
			VALUES (?, 'dm')
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
}