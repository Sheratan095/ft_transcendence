-- TO DO remove it - Drop tables in correct order (child first due to foreign key)
DROP TABLE IF EXISTS profiles;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
	id TEXT PRIMARY KEY,
	username TEXT UNIQUE NOT NULL COLLATE NOCASE,
	user_id TEXT NOT NULL
	-- FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
