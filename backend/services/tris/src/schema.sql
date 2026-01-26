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
VALUES ('1', 13, 7);

INSERT INTO user_stats (user_id, wins, losses)
VALUES ('2', 8, 10);

INSERT INTO user_stats (user_id, wins, losses)
VALUES ('3', 5, 9);

INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at)
VALUES ('match1', '1', '2', '1', '2026-01-01 10:00:00');

-- Sample matches for charting (25 entries)
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match2', '1', '2', '1', '2026-01-02 11:00:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match3', '2', '1', '2', '2026-01-03 12:15:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match4', '1', '3', '3', '2026-01-04 09:30:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match5', '3', '1', '1', '2026-01-05 14:45:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match6', '1', '2', '1', '2026-01-06 16:00:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match7', '2', '3', '3', '2026-01-07 18:20:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match8', '1', '3', '3', '2026-01-08 10:10:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match9', '3', '2', '2', '2026-01-09 13:00:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match10', '1', '2', '2', '2026-01-10 09:05:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match11', '2', '1', '1', '2026-01-11 11:11:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match12', '1', '3', '1', '2026-01-12 15:30:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match13', '3', '1', '3', '2026-01-13 17:45:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match14', '2', '3', '2', '2026-01-14 08:20:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match15', '1', '2', '2', '2026-01-15 19:00:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match16', '1', '3', '1', '2026-01-16 20:10:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match17', '3', '2', '2', '2026-01-17 07:30:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match18', '2', '1', '2', '2026-01-18 12:00:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match19', '1', '2', '1', '2026-01-19 13:25:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match20', '3', '1', '1', '2026-01-20 14:55:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match21', '2', '3', '3', '2026-01-21 09:40:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match22', '1', '2', '1', '2026-01-22 10:05:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match22b', '1', '2', '2', '2026-01-22 14:05:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match22c', '1', '3', '1', '2026-01-22 16:05:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match23', '1', '3', '1', '2026-01-23 11:11:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match23b', '2', '1', '2', '2026-01-23 13:11:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match23c', '1', '2', '1', '2026-01-23 15:11:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match24', '2', '1', '1', '2026-01-24 16:16:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match25', '3', '2', '2', '2026-01-25 18:18:00');
INSERT INTO matches (id, player_x_id, player_o_id, winner_id, ended_at) VALUES ('match26', '1', '2', '1', '2026-01-26 20:20:00');
