-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users
(
	id			TEXT PRIMARY KEY,
	username	TEXT UNIQUE NOT NULL COLLATE NOCASE,
	language	TEXT NOT NULL CHECK (language IN ('en', 'fr', 'it')) DEFAULT 'en',
	created_at	TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	avatar_url	TEXT DEFAULT NULL

	-- FOREIGN KEY (id) REFERENCES users (id) ON DELETE CASCADE -> auth/auth_accounts
);

-- ------------------------------------------------------------
-- RELATIONSSHIPS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_relationships
(
	requester_id		TEXT NOT NULL,
	target_id			TEXT NOT NULL,
	relationship_status	TEXT NOT NULL CHECK (relationship_status IN ('pending', 'accepted', 'rejected', 'blocked')),
	created_at			TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at			TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

	PRIMARY KEY (requester_id, target_id),
	CHECK (requester_id != target_id),
	FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO users (id, username, language, created_at, avatar_url)
VALUES ('1', 'test1', 'en', CURRENT_TIMESTAMP, NULL);

INSERT INTO users (id, username, language, created_at, avatar_url)
VALUES ('2', 'test2', 'en', CURRENT_TIMESTAMP, NULL);

INSERT INTO users (id, username, language, created_at, avatar_url)
VALUES ('3', 'test3', 'en', CURRENT_TIMESTAMP, NULL);

-- INSERT INTO user_relationships (requester_id, target_id, relationship_status, created_at, updated_at)
-- VALUES ('1', '2', 'blocked', '2025-11-18 17:03:35', '2025-11-18 17:03:35');