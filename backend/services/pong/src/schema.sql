PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tournaments
(
	id				TEXT PRIMARY KEY,
	name			TEXT NOT NULL,
	creator_id		TEXT NOT NULL,
	ended_at		DATETIME DEFAULT CURRENT_TIMESTAMP,
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
	top				INTEGER, -- NULL if the tournament is ongoing
	
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

INSERT INTO user_stats (user_id, games_played, wins, losses, tournament_wins, tournaments_participated)
VALUES ('1', 30, 20, 10, 2, 5);

INSERT INTO user_stats (user_id, games_played, wins, losses, tournament_wins, tournaments_participated)
VALUES ('2', 27, 10, 17, 0, 2);

INSERT INTO user_stats (user_id, games_played, wins, losses, tournament_wins, tournaments_participated)
VALUES ('3', 21, 9, 12, 1, 3);

-- Sample matches for charting (Pong)
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong1', '1', '2', 10, 5, '1', '2026-01-01 10:00:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong2', '1', '2', 8, 10, '2', '2026-01-02 11:00:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong3', '2', '1', 5, 10, '1', '2026-01-03 12:15:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong4', '1', '3', 10, 3, '1', '2026-01-04 09:30:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong5', '3', '1', 10, 7, '3', '2026-01-05 14:45:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong6', '1', '2', 10, 0, '1', '2026-01-06 16:00:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong7', '2', '3', 6, 10, '3', '2026-01-07 18:20:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong8', '1', '3', 4, 10, '3', '2026-01-08 10:10:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong9', '3', '2', 10, 8, '3', '2026-01-09 13:00:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong10', '1', '2', 10, 9, '1', '2026-01-10 09:05:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong11', '2', '1', 3, 10, '1', '2026-01-11 11:11:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong12', '1', '3', 10, 5, '1', '2026-01-12 15:30:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong13', '3', '1', 10, 9, '3', '2026-01-13 17:45:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong14', '2', '3', 10, 2, '2', '2026-01-14 08:20:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong15', '1', '2', 5, 10, '2', '2026-01-15 19:00:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong16', '1', '3', 10, 8, '1', '2026-01-16 20:10:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong17', '3', '2', 5, 10, '2', '2026-01-17 07:30:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong18', '2', '1', 10, 4, '2', '2026-01-18 12:00:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong19', '1', '2', 10, 6, '1', '2026-01-19 13:25:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong20', '3', '1', 2, 10, '1', '2026-01-20 14:55:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong21', '2', '3', 10, 9, '2', '2026-01-21 09:40:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong22', '1', '2', 10, 7, '1', '2026-01-22 10:05:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong22b', '1', '2', 8, 10, '2', '2026-01-22 14:05:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong23', '1', '3', 10, 4, '1', '2026-01-23 11:11:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong23b', '2', '1', 6, 10, '1', '2026-01-23 13:11:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong23c', '1', '2', 10, 3, '1', '2026-01-23 15:11:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong24', '2', '1', 5, 10, '1', '2026-01-24 16:16:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong25', '1', '3', 7, 10, '3', '2026-01-25 10:00:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong26', '2', '3', 10, 4, '2', '2026-01-25 11:30:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong27', '1', '2', 6, 10, '2', '2026-01-25 13:00:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong28', '3', '1', 8, 10, '1', '2026-01-25 14:30:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong29', '2', '1', 10, 3, '2', '2026-01-25 16:00:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong30', '3', '2', 10, 7, '3', '2026-01-25 17:30:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong31', '1', '2', 10, 8, '1', '2026-01-26 09:00:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong32', '3', '1', 5, 10, '1', '2026-01-26 10:30:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong33', '2', '3', 4, 10, '3', '2026-01-26 12:00:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong34', '1', '3', 10, 6, '1', '2026-01-26 13:30:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong35', '2', '1', 8, 10, '1', '2026-01-26 15:00:00');
INSERT INTO matches (id, player_left_id, player_right_id, player_left_score, player_right_score, winner_id, ended_at) VALUES ('pong36', '3', '2', 10, 9, '3', '2026-01-26 16:30:00');