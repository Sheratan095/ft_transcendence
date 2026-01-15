PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- MATCHES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches
(
	id			TEXT PRIMARY KEY,
	player_x_id	TEXT NOT NULL,
	player_o_id	TEXT NOT NULL,
	winner_id	TEXT, -- NULL if the match is ongoing and draws
	ended_at	DATETIME DEFAULT CURRENT_TIMESTAMP, -- time when the match is added to the db
	-- TEXT ELO is calculated in the application layer because it's a business logic not a db logic

	CHECK (player_x_id != player_o_id)

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
	wins			INTEGER DEFAULT 0,
	losses			INTEGER DEFAULT 0

	-- FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO user_stats (user_id, wins, losses)
VALUES ('1', 1, 0);

INSERT INTO user_stats (user_id, wins, losses)
VALUES ('2', 0, 1);

INSERT INTO user_stats (user_id, wins, losses)
VALUES ('3', 0, 0);

INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at)
VALUES ('match1', '1', '2', '1', '2024-01-01 10:00:00');