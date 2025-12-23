PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- MATCHES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches
(
	id			TEXT PRIMARY KEY,
	player_one	TEXT NOT NULL,
	player_two	TEXT NOT NULL,
	winner_id	TEXT, -- NULL if the match is ongoing and draws
	status		TEXT NOT NULL CHECK (status IN ('ongoing', 'finished')),
	created_at	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	ended_at	DATETIME,
	-- TEXT ELO is calculated in the application layer because it's a business logic not a db logic

	CHECK (player_one != player_two),

	-- Ensure consistency between status and ended_at
	CHECK
	(
		(status = 'ongoing'  AND ended_at IS NULL)
	OR
	(
		status = 'finished' AND ended_at IS NOT NULL)
	)

	-- FOREIGN KEY (player_one) REFERENCES users(id) ON DELETE CASCADE,
	-- FOREIGN KEY (player_two) REFERENCES users(id) ON DELETE CASCADE,
	-- FOREIGN KEY (winner) REFERENCES users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- USER MATCH STATS
-- ------------------------------------------------------------
CREATE TABLE user_stats
(
	user_id			TEXT PRIMARY KEY,
	games_played	INTEGER DEFAULT 0,
	wins			INTEGER DEFAULT 0,
	losses			INTEGER DEFAULT 0,
	draws			INTEGER DEFAULT 0

	-- FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO user_stats (user_id, games_played, wins, losses, draws)
VALUES ('1', 0, 0, 0, 0);

INSERT INTO user_stats (user_id, games_played, wins, losses, draws)
VALUES ('2', 0, 0, 0, 0);

INSERT INTO user_stats (user_id, games_played, wins, losses, draws)
VALUES ('3', 0, 0, 0, 0);