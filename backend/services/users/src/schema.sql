-- Drop tables to reset database on restart (like auth service)
DROP TABLE IF EXISTS users;

-- Create profiles table
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	username TEXT UNIQUE NOT NULL COLLATE NOCASE,
	language TEXT NOT NULL CHECK (language IN ('en', 'fr', 'it')) DEFAULT 'en',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	-- FOREIGN KEY (id) REFERENCES users (id) ON DELETE CASCADE
);
