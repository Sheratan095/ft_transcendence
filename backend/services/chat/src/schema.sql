-- ------------------------------------------------------------
-- CHATS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chats
(
	id			TEXT PRIMARY KEY,
	name		TEXT NOT NULL,
	chat_type	TEXT NOT NULL CHECK(chat_type IN ('dm', 'group')),
	created_at	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	avatar_url	TEXT -- Future implementation
);

-- ------------------------------------------------------------
-- CHAT MEMBERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_members
(
	user_id		TEXT NOT NULL,
	chat_id		TEXT NOT NULL,
	joined_at	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

	PRIMARY KEY (user_id, chat_id),
	FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
	-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE  -> auth/auth_accounts
);

-- ------------------------------------------------------------
-- MESSAGES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages
(
	id				TEXT NOT NULL,
	chat_id			TEXT NOT NULL,
	sender_id		TEXT NOT NULL,
	content			TEXT NOT NULL,
	type			TEXT NOT NULL CHECK(type IN ('text', 'user_join', 'system')),
	created_at		DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

	PRIMARY KEY (id),
	FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
	-- FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE -> auth/auth_accounts
);

-- ------------------------------------------------------------
-- MESSAGE STATUSES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_statuses
(
	message_id		TEXT NOT NULL,
	user_id			TEXT NOT NULL, -- represents the user who is receiving the message
	status			TEXT NOT NULL CHECK(status IN ('sent', 'delivered', 'read')),
	updated_at		DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

	PRIMARY KEY (message_id, user_id),
	FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
	-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE -> auth/auth_accounts
);
