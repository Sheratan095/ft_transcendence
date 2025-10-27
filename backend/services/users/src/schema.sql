-- TO DO remove it - Drop tables in correct order (child first due to foreign key)
DROP TABLE IF EXISTS user_relationships;
DROP TABLE IF EXISTS users;

-- Create profiles table
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	username TEXT UNIQUE NOT NULL COLLATE NOCASE,
	language TEXT NOT NULL CHECK (language IN ('en', 'fr', 'it')) DEFAULT 'en',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	-- FOREIGN KEY (id) REFERENCES users (id) ON DELETE CASCADE -> auth/auth_accounts
);

-- status is a reserved keyword in SQL, so we use relationship_status instead
CREATE TABLE IF NOT EXISTS user_relationships (
	user_id TEXT NOT NULL,
	addressee_id TEXT NOT NULL,
	relationship_status TEXT NOT NULL CHECK (relationship_status IN ('pending', 'accepted', 'rejected', 'blocked')),
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (user_id, addressee_id),
	CHECK (user_id <> addressee_id),
	FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
	FOREIGN KEY (addressee_id) REFERENCES users (id) ON DELETE CASCADE
);