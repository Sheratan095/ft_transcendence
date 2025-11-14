-- TO DO remove it - Drop tables in correct order (child first due to foreign key)
DROP TABLE IF EXISTS user_relationships;
DROP TABLE IF EXISTS users;

-- Create profiles table
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY, -- TO DO change it
	username TEXT UNIQUE NOT NULL COLLATE NOCASE, -- TO DO change it
	language TEXT NOT NULL CHECK (language IN ('en', 'fr', 'it')) DEFAULT 'en',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	avatar_url TEXT DEFAULT NULL
	-- FOREIGN KEY (id) REFERENCES users (id) ON DELETE CASCADE -> auth/auth_accounts
);

-- status is a reserved keyword in SQL, so we use relationship_status instead
CREATE TABLE IF NOT EXISTS user_relationships (
    requester_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relationship_status TEXT NOT NULL CHECK (relationship_status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (requester_id, target_id),
    CHECK (requester_id != target_id),
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE
);
