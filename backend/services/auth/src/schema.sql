-- COLLATE NOCASE for case-insensitive unique constraints on email and username

-- ------------------------------------------------------------
-- ACCOUNTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_accounts
(
	id				TEXT PRIMARY KEY,
	email			TEXT UNIQUE NOT NULL COLLATE NOCASE,
	password		TEXT NOT NULL,
	created_at		DATETIME DEFAULT CURRENT_TIMESTAMP,
	tfa_enabled		BOOLEAN NOT NULL DEFAULT 0 -- Two-Factor Authentication active flag
);

-- ------------------------------------------------------------
-- REFRESH TOKENS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens
(
	user_id			TEXT PRIMARY KEY,
	refresh_token	TEXT NOT NULL,
	created_at		DATETIME DEFAULT CURRENT_TIMESTAMP,
	expires_at		DATETIME NOT NULL,

	FOREIGN KEY (user_id) REFERENCES auth_accounts (id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 2FA TOKENS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS twofactor_tokens
(
	user_id			TEXT PRIMARY KEY,
	otp_code		TEXT NOT NULL,
	created_at		DATETIME DEFAULT CURRENT_TIMESTAMP,
	expires_at		DATETIME NOT NULL,

	FOREIGN KEY (user_id) REFERENCES auth_accounts (id) ON DELETE CASCADE
);

-- Password: Mrco@123_

INSERT INTO auth_accounts (id, email, password, created_at, tfa_enabled)
VALUES ('1', 'test1@gmail.com', '$2b$10$mUv8z0znMrFPbTfkAQtV..MDZ/8rRsv0NrFyFIGLR0i65MSYdlgga', CURRENT_TIMESTAMP, 0);

INSERT INTO auth_accounts (id, email, password, created_at, tfa_enabled)
VALUES ('2', 'test2@gmail.com', '$2b$10$mUv8z0znMrFPbTfkAQtV..MDZ/8rRsv0NrFyFIGLR0i65MSYdlgga', CURRENT_TIMESTAMP, 0);

INSERT INTO auth_accounts (id, email, password, created_at, tfa_enabled)
VALUES ('3', 'test3@gmail.com', '$2b$10$mUv8z0znMrFPbTfkAQtV..MDZ/8rRsv0NrFyFIGLR0i65MSYdlgga', CURRENT_TIMESTAMP, 0);