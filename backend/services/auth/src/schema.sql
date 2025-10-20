-- TO DO remove it - Drop tables in correct order (child first due to foreign key)
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	email TEXT UNIQUE NOT NULL,
	username TEXT UNIQUE NOT NULL,
	password TEXT NOT NULL,
	created_at TEXT DEFAULT (datetime('now')),
	updated_at TEXT DEFAULT (datetime('now'))
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	refresh_token TEXT NOT NULL,
	created_at TEXT DEFAULT (datetime('now')),
	expires_at TEXT NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
