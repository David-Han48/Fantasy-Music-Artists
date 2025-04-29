
CREATE DATABASE IF NOT EXISTS music_fantasy_league;
USE music_fantasy_league;

CREATE TABLE Player (
    playerId INT PRIMARY KEY AUTO_INCREMENT,
    playerName VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL
);

CREATE TABLE League (
    leagueId INT PRIMARY KEY AUTO_INCREMENT,
    leagueName VARCHAR(50) NOT NULL,
    playerCount INT DEFAULT 0,
    ownerId INT,
    FOREIGN KEY (ownerId) REFERENCES Player(playerId) ON DELETE SET NULL
);

CREATE TABLE Artist (
    artistId INT PRIMARY KEY AUTO_INCREMENT,
    artistName VARCHAR(100) NOT NULL
);

CREATE TABLE Roster (
    rosterId INT PRIMARY KEY AUTO_INCREMENT,
    rosterName VARCHAR(50) NOT NULL,
    budget INT NOT NULL DEFAULT 10000,
    points INT NOT NULL DEFAULT 0,
    playerId INT NOT NULL,
    leagueId INT NOT NULL,
    FOREIGN KEY (playerId) REFERENCES Player(playerId) ON DELETE CASCADE,
    FOREIGN KEY (leagueId) REFERENCES League(leagueId) ON DELETE CASCADE,
    CONSTRAINT unique_player_league UNIQUE (playerId, leagueId)
);

CREATE TABLE RosterMember (
    artistId INT,
    rosterId INT,
    PRIMARY KEY (artistId, rosterId),
    FOREIGN KEY (artistId) REFERENCES Artist(artistId) ON DELETE CASCADE,
    FOREIGN KEY (rosterId) REFERENCES Roster(rosterId) ON DELETE CASCADE
);

CREATE TABLE ArtistStats (
    artistId INT,
    month INT NOT NULL,
    year INT NOT NULL,
    listeners INT NOT NULL,
    followers INT NOT NULL,
    popularity INT NOT NULL,
    price INT NOT NULL,
    PRIMARY KEY (artistId, month, year),
    FOREIGN KEY (artistId) REFERENCES Artist(artistId) ON DELETE CASCADE,
    CONSTRAINT check_month CHECK (month BETWEEN 1 AND 12),
    CONSTRAINT check_positive_stats CHECK (listeners >= 0 AND followers >= 0 AND popularity >= 0 AND price >= 0)
);

CREATE TABLE GameSettings (
  id INT PRIMARY KEY DEFAULT 1,
  current_month INT NOT NULL,
  current_year INT NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO GameSettings (current_month, current_year) VALUES (1, 2024);