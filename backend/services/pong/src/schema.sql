PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tournaments
(
	id				TEXT PRIMARY KEY,
	name			TEXT NOT NULL,
	creator_id		TEXT NOT NULL,
	created_at		DATETIME DEFAULT CURRENT_TIMESTAMP,
	winner_id		TEXT NOT NULL -- The tournament is saved when it ends

	-- FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- TOURNAMENT PARTICIPANTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tournament_participants
(
	tournament_id	TEXT NOT NULL,
	user_id			TEXT NOT NULL,
	joined_at		DATETIME DEFAULT CURRENT_TIMESTAMP,
	
	PRIMARY KEY (tournament_id, user_id)
	
	-- FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
	-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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
	power_ups			BOOLEAN DEFAULT FALSE,
	tournament_id		TEXT, -- NULL if not part of a tournament
	-- TEXT ELO is calculated in the application layer because it's a business logic not a db logic

	CHECK (player_left_id != player_right_id)

	-- FOREIGN KEY (player_left_id) REFERENCES users(id) ON DELETE CASCADE,
	-- FOREIGN KEY (player_right_id) REFERENCES users(id) ON DELETE CASCADE,
	-- FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
	-- FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- USER MATCH STATS
-- ------------------------------------------------------------
CREATE TABLE user_stats
(
	user_id						TEXT PRIMARY KEY,
	games_played				INTEGER DEFAULT 0,
	wins						INTEGER DEFAULT 0,
	losses						INTEGER DEFAULT 0,
	tournament_wins				INTEGER DEFAULT 0,
	tournaments_participated	INTEGER DEFAULT 0

	-- FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO user_stats (user_id, games_played, wins, losses)
VALUES ('1', 0, 0, 0);

INSERT INTO user_stats (user_id, games_played, wins, losses)
VALUES ('2', 0, 0, 0);

INSERT INTO user_stats (user_id, games_played, wins, losses)
VALUES ('3', 0, 0, 0);