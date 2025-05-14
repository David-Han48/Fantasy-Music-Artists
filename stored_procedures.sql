LIMIT 1;
    
    SELECT budget INTO current_budget
    FROM Roster
    WHERE rosterId = p_rosterId;
    
    IF current_budget < artist_price THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Not enough budget to add this artist';
    END IF;
    
    START TRANSACTION;
    
    INSERT INTO RosterMember (artistId, rosterId)
    VALUES (p_artistId, p_rosterId);
    
    UPDATE Roster
    SET budget = budget - artist_price
    WHERE rosterId = p_rosterId;
    
    COMMIT;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE RemoveArtistFromRoster(IN p_rosterId INT, IN p_artistId INT)
BEGIN
    DECLARE artist_price INT;
    
    SELECT price INTO artist_price
    FROM ArtistStats
    WHERE artistId = p_artistId
    ORDER BY year DESC, month DESC
    LIMIT 1;
    
    START TRANSACTION;
    
    DELETE FROM RosterMember
    WHERE rosterId = p_rosterId AND artistId = p_artistId;
    
    UPDATE Roster
    SET budget = budget + (artist_price * 0.7)
    WHERE rosterId = p_rosterId;
    
    COMMIT;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE GetLeagueStandings(IN p_leagueId INT)
BEGIN
    SELECT r.playerId, p.playerName, SUM(r.points) as total_points
    FROM Roster r
    JOIN Player p ON r.playerId = p.playerId
    WHERE r.leagueId = p_leagueId
    GROUP BY r.playerId, p.playerName
    ORDER BY total_points DESC;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE CalculateRosterPoints(IN p_rosterId INT)
BEGIN
    DECLARE total_points INT DEFAULT 0;
    
    SELECT SUM(
        (s.listeners / 1000000) +
        (s.followers / 1000000) +
        (s.popularity * 2)
    ) INTO total_points
    FROM RosterMember rm
    JOIN ArtistStats s ON rm.artistId = s.artistId
    WHERE rm.rosterId = p_rosterId
    AND (s.year, s.month) IN (
        SELECT MAX(year), MAX(month)
        FROM ArtistStats
        WHERE artistId = s.artistId
        GROUP BY artistId
    );
    
    UPDATE Roster
    SET points = total_points
    WHERE rosterId = p_rosterId;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE UpdateAllRosterPoints()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE roster_id INT;
    DECLARE cur CURSOR FOR SELECT rosterId FROM Roster;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
    
    OPEN cur;
    
    roster_loop: LOOP
        FETCH cur INTO roster_id;
        IF done THEN
            LEAVE roster_loop;
        END IF;
        
        CALL CalculateRosterPoints(roster_id);
    END LOOP;
    
    CLOSE cur;
END //
DELIMITER ;