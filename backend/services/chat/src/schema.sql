-- ENUMS ------------------------------------------------------------

CREATE TYPE chat_type IF NOT EXISTS AS ENUM ('dm', 'group');
CREATE TYPE message_status IF NOT EXISTS AS ENUM ('sent', 'delivered');


-- CHATS ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chats (
	chat_id      CHAR(36) NOT NULL,
	type         chat_type NOT NULL,
	created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

	PRIMARY KEY (chat_id)
);


-- CHAT MEMBERS ------------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_members (
	user_id      CHAR(36) NOT NULL,
	chat_id      CHAR(36) NOT NULL,
	joined_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

	PRIMARY KEY (user_id, chat_id),

	CONSTRAINT fk_chat_members_chat
		FOREIGN KEY (chat_id) REFERENCES chats(chat_id)
		ON DELETE CASCADE,

	CONSTRAINT fk_chat_members_user
		FOREIGN KEY (user_id) REFERENCES users(user_id)
		ON DELETE CASCADE
);


-- MESSAGES ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS messages (
	message_id   CHAR(36) NOT NULL,
	chat_id      CHAR(36) NOT NULL,
	sender_id    CHAR(36) NOT NULL,
	content      TEXT NOT NULL,
	created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

	PRIMARY KEY (message_id),

	KEY idx_messages_chat_created (chat_id, created_at),

	CONSTRAINT fk_messages_chat
		FOREIGN KEY (chat_id) REFERENCES chats(chat_id)
		ON DELETE CASCADE,

	CONSTRAINT fk_messages_sender
		FOREIGN KEY (sender_id) REFERENCES users(user_id)
		ON DELETE CASCADE
);


-- MESSAGE STATUSES --------------------------------------------------

CREATE TABLE IF NOT EXISTS message_statuses (
	message_id     CHAR(36) NOT NULL,
	user_id        CHAR(36) NOT NULL,
	status         message_status NOT NULL,
	updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

	PRIMARY KEY (message_id, user_id),

	CONSTRAINT fk_msg_status_message
		FOREIGN KEY (message_id) REFERENCES messages(message_id)
		ON DELETE CASCADE,

	CONSTRAINT fk_msg_status_user
		FOREIGN KEY (user_id) REFERENCES users(user_id)
		ON DELETE CASCADE
);
