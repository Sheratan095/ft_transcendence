-- TO DO remove it - Drop tables in correct order (child first due to foreign key)
-- DROP TABLE IF EXISTS refresh_tokens;
-- DROP TABLE IF EXISTS auth_accounts;
-- DROP TABLE IF EXISTS twofactor_tokens;

-- COLLATE NOCASE for case-insensitive unique constraints on email and username

-- Create auth_accounts table
CREATE TABLE IF NOT EXISTS auth_accounts (
	id TEXT PRIMARY KEY,
	email TEXT UNIQUE NOT NULL COLLATE NOCASE,
	password TEXT NOT NULL,
	created_at TEXT DEFAULT (datetime('now')),
	tfa_enabled BOOLEAN NOT NULL DEFAULT 0 -- Two-Factor Authentication active flag
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	refresh_token TEXT NOT NULL,
	created_at TEXT DEFAULT (datetime('now')),
	expires_at TEXT NOT NULL,
	FOREIGN KEY (user_id) REFERENCES auth_accounts (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS twofactor_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES auth_accounts (id) ON DELETE CASCADE -- Delete 2FA tokens when user is deleted
);

-- Password: Mrco@123_

INSERT INTO auth_accounts (id, email, password, created_at, tfa_enabled)
VALUES ('1', 'test1@gmail.com', '$2b$10$mUv8z0znMrFPbTfkAQtV..MDZ/8rRsv0NrFyFIGLR0i65MSYdlgga', datetime('now'), 0);

INSERT INTO auth_accounts (id, email, password, created_at, tfa_enabled)
VALUES ('2', 'test2@gmail.com', '$2b$10$mUv8z0znMrFPbTfkAQtV..MDZ/8rRsv0NrFyFIGLR0i65MSYdlgga', datetime('now'), 0);
