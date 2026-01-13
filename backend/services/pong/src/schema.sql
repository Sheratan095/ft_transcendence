PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- MATCHES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches
(
	id					TEXT PRIMARY KEY,
	player_left_id		TEXT NOT NULL,
	player_right_id		TEXT NOT NULL,
	player_left_score	INTEGER DEFAULT 0,
	player_right_score	INTEGER DEFAULT 0,
	winner_id			TEXT, -- NULL if the match is ongoing and draws
	ended_at			DATETIME DEFAULT CURRENT_TIMESTAMP, -- time when the match is added to the db
	power_ups			BOOLEAN DEFAULT FALSE
	-- TEXT ELO is calculated in the application layer because it's a business logic not a db logic

	CHECK (player_left_id != player_right_id)

	-- FOREIGN KEY (player_left_id) REFERENCES users(id) ON DELETE CASCADE,
	-- FOREIGN KEY (player_right_id) REFERENCES users(id) ON DELETE CASCADE,
	-- FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- USER MATCH STATS
-- ------------------------------------------------------------
CREATE TABLE user_stats
(
	user_id				TEXT PRIMARY KEY,
	games_played		INTEGER DEFAULT 0,
	wins				INTEGER DEFAULT 0,
	losses				INTEGER DEFAULT 0,
	tournaments_wins	INTEGER DEFAULT 0

	-- FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO user_stats (user_id, games_played, wins, losses)
VALUES ('1', 0, 0, 0);

INSERT INTO user_stats (user_id, games_played, wins, losses)
VALUES ('2', 0, 0, 0);

INSERT INTO user_stats (user_id, games_played, wins, losses)
VALUES ('3', 0, 0, 0);