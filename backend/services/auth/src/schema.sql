-- TO DO remove it - Drop tables in correct order (child first due to foreign key)
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;

-- COLLATE NOCASE for case-insensitive unique constraints on email and username

-- Create users table
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	email TEXT UNIQUE NOT NULL COLLATE NOCASE,
	username TEXT UNIQUE NOT NULL COLLATE NOCASE,
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

CREATE TABLE IF NOT EXISTS twofactor_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);