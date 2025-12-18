-- ------------------------------------------------------------
-- MATCHES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches
(
	id			TEXT PRIMARY KEY,
	player_one	TEXT NOT NULL,
	player_two	TEXT NOT NULL,
	winner		TEXT, -- NULL if the match is ongoing
	status		TEXT NOT NULL CHECK (status IN ('ongoing', 'finished')),
	created_at	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	ended_at	DATETIME,

	CHECK (score >= 0),
	CHECK (player_one != player_two)

	-- FOREIGN KEY (player_one) REFERENCES users(id) ON DELETE CASCADE,
	-- FOREIGN KEY (player_two) REFERENCES users(id) ON DELETE CASCADE,
	-- FOREIGN KEY (winner) REFERENCES users(id) ON DELETE SET NULL
)

-- ------------------------------------------------------------
-- USER MATCH STATS
-- ------------------------------------------------------------
CREATE TABLE user_stats
(
	user_id			TEXT PRIMARY KEY,
	games_played	INTEGER DEFAULT 0,
	wins			INTEGER DEFAULT 0,
	losses			INTEGER DEFAULT 0,
	draws			INTEGER DEFAULT 0,

	-- FOREIGN KEY (user_id) REFERENCES users(id)
);