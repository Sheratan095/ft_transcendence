-- TO DO remove it - Drop tables in correct order (child first due to foreign key)
DROP TABLE IF EXISTS users;

-- Create profiles table
CREATE TABLE IF NOT EXISTS users (
	user_id TEXT PRIMARY KEY,
	username TEXT UNIQUE NOT NULL COLLATE NOCASE,
	language TEXT NOT NULL CHECK (language IN ('en', 'es', 'it')) DEFAULT 'en',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	-- FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);
