---
title: Database Design - Stage 3

---

# Database Design - Stage 3

# 1, Create Table
GCP Connection and databases:
![image](https://hackmd.io/_uploads/Skdf7zca1x.png)

![Screenshot 2025-04-01 at 18.12.07](https://hackmd.io/_uploads/B1JeXe5aJl.png)

## 1. League Table

```sql
CREATE TABLE League (
    leagueId INT PRIMARY KEY,
    leagueName VARCHAR(20),
    playerCount INT,
    ownerId INT
);
```

## 2. Player Table
```sql
CREATE TABLE Player (
    playerId INT PRIMARY KEY,
    playerName VARCHAR(20)
);
```
## 3. Artist Table
```sql
CREATE TABLE Artist (
    artistId INT PRIMARY KEY,
    artistName VARCHAR(20)
);
```
## 3. Roster Table
```sql
CREATE TABLE Roster (
    rosterId INT PRIMARY KEY,
    rosterName VARCHAR(20),
    budget INT,
    points INT,
    playerId INT,   
    leagueId INT, 
    FOREIGN KEY (playerId) REFERENCES Player(playerId),
    FOREIGN KEY (leagueId) REFERENCES League(leagueId)
);
```

## 4. RosterMember Table
```sql
CREATE TABLE RosterMember (
    artistId INT,
    rosterId INT,
    PRIMARY KEY (artistId, rosterId),
    FOREIGN KEY (artistId) REFERENCES Artist(artistId),
    FOREIGN KEY (rosterId) REFERENCES Roster(rosterId)
);
```
## 6. ArtistStats Table
```sql
CREATE TABLE ArtistStats (
    artistId INT,
    month INT,
    year INT,
    listeners INT,
    followers INT,
    popularity INT,
    price INT,
    PRIMARY KEY (artistId, month, year),
    FOREIGN KEY (artistId) REFERENCES Artist(artistId)
);
```
# 2, Insert Data
![count](https://hackmd.io/_uploads/H15PMe5Tke.png)


# 3, Advanced query

## 1, Show the top 1 player in each league
```sql
SELECT leagueName, playerName, total_points
FROM (
    SELECT 
        l.leagueName,
        p.playerName,
        SUM(r.points) AS total_points,
        DENSE_RANK() OVER (
            PARTITION BY r.leagueId
            ORDER BY SUM(r.points) DESC
        ) AS rank_in_league
    FROM Roster r
    JOIN Player p ON r.playerId = p.playerId
    JOIN League l ON r.leagueId = l.leagueId
    GROUP BY r.leagueId, r.playerId
) AS ranked_players
WHERE rank_in_league <= 1
LIMIT 15;
```
![Screenshot 2025-04-01 at 18.15.27](https://hackmd.io/_uploads/rygoq7x5a1x.png)

## 2, Average Listeners and Price for Each Artist (Jan–Mar 2025)
```sql
SELECT 
    a.artistName,
    AVG(s.listeners) AS avg_listeners,
    AVG(s.price) AS avg_price
FROM ArtistStats s
JOIN Artist a ON s.artistId = a.artistId
WHERE (s.year = 2025 AND s.month BETWEEN 1 AND 3)
GROUP BY a.artistId
LIMIT 15;
```
![Screenshot 2025-04-01 at 18.15.45](https://hackmd.io/_uploads/SJRj7eq61g.png)

## 3, Artists Owned by a Specific Player Across All Rosters (Take Player 11 for example)

```sql

SELECT DISTINCT a.artistName
FROM Artist a
WHERE a.artistId IN (
    SELECT rm.artistId
    FROM RosterMember rm
    JOIN Roster r ON rm.rosterId = r.rosterId
    WHERE r.playerId = 11
)
LIMIT 15;

```
![Screenshot 2025-04-01 at 18.21.07](https://hackmd.io/_uploads/BJ4ZHl5a1l.png)

**The output only have 2 lines because Player11 only have 2 artists across all rosters**

## 4, Top 15 Artists with the Price Increase greater than average from Feb to Mar 2025

```sql

SELECT 
    a.artistName,
    (s3.price - s2.price) AS price_increase
FROM ArtistStats s2
JOIN ArtistStats s3 ON s2.artistId = s3.artistId 
    AND s2.month = 2 AND s3.month = 3
    AND s2.year = 2025 AND s3.year = 2025
JOIN Artist a ON a.artistId = s2.artistId
WHERE (s3.price - s2.price) > (
    SELECT AVG(s3.price - s2.price)
    FROM ArtistStats s2
    JOIN ArtistStats s3 ON s2.artistId = s3.artistId
        AND s2.month = 2 AND s3.month = 3
        AND s2.year = 2025 AND s3.year = 2025
)
ORDER BY price_increase DESC
LIMIT 15;

```
![Screenshot 2025-04-01 at 18.43.07](https://hackmd.io/_uploads/rkdf5e5pye.png)



## 5, Index analysis
Query 1 before indexing:
![image](https://hackmd.io/_uploads/ByOFWb56Je.png)

Query 2 before indexing:
![image](https://hackmd.io/_uploads/BJ52WW5pkx.png)

Query 3 before indexing:
![image](https://hackmd.io/_uploads/B1ly7W9ayx.png)

Query 4 before indexing:
![image](https://hackmd.io/_uploads/rJXlVZqp1l.png)



We tried the following indexes:
Query 1:
```sql=
CREATE INDEX idx_roster_league_player_points ON Roster(leagueId, playerId, points);
CREATE INDEX idx_roster_league_player ON Roster(leagueId, playerId);
CREATE INDEX idx_player_playerId ON Player(playerId);
```

Query 2:
```sql=
CREATE INDEX idx_artiststats_year_month_artistid ON ArtistStats(year, month, artistId);
CREATE INDEX idx_artist_artistid ON Artist(artistId);
CREATE INDEX idx_artist_artistid ON Artist(artistId);
```

Query 3:
```sql=
CREATE INDEX idx_rostermember_rosterid ON RosterMember(rosterId);
CREATE INDEX idx_roster_playerid ON Roster(playerId);
CREATE INDEX idx_rostermember_covering ON RosterMember(rosterId, artistId);
```

Query 4:
```sql=
CREATE INDEX idx_artiststats_artistid_year_month ON ArtistStats(artistId, year, month);
CREATE INDEX idx_artiststats_covering ON ArtistStats(artistId, year, month, price);
CREATE INDEX idx_artist_artistid ON Artist(artistId);
```

Unfortunately, none of these indexes improved query performance for any query. Below are explanation for possible reasons why this happened.

None of the above indexing we tried improved the performance of query 1. This is likely due to query 1 involving SUM(), which means the query needs to go through all values even if it is sorted. The DENSE_RANK() function is ordered by SUM(), so it is also bottlenecked by it.

Query 2's performance also cannot be improved by indexing for a reason similar to query 1. Notice that it requires finding the average, which means all relevant values must be processed and sorting does not help with that.

Query 3's performance was also not improved by indexing. This is likely due to the database having to resolve the subquery entirely first. Indexing is generally helpful for DISTINCT but it is again only used after the subquery, so indexing is not too useful here.

Indexing also did not help query 4. This is likely due to self-joining, which requires O(N) time regardless of any indexing. Also, we are again calculating AVG(), which indexing doesn't optimize.