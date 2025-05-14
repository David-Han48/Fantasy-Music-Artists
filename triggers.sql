USE music_fantasy_league;

DELIMITER //
CREATE TRIGGER after_artist_stats_update
AFTER INSERT ON ArtistStats
FOR EACH ROW
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE roster_id INT;
    DECLARE cur CURSOR FOR 
        SELECT rm.rosterId 
        FROM RosterMember rm 
        WHERE rm.artistId = NEW.artistId;
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

DELIMITER //
CREATE TRIGGER before_roster_insert
BEFORE INSERT ON Roster
FOR EACH ROW
BEGIN
    DECLARE roster_count INT;
    
    SELECT COUNT(*) INTO roster_count
    FROM Roster
    WHERE playerId = NEW.playerId AND leagueId = NEW.leagueId;
    
    IF roster_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Player already has a roster in this league';
    END IF;
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER after_roster_delete
AFTER DELETE ON Roster
FOR EACH ROW
BEGIN
    DECLARE roster_count INT;
    
    SELECT COUNT(*) INTO roster_count
    FROM Roster
    WHERE playerId = OLD.playerId AND leagueId = OLD.leagueId;
    
    IF roster_count = 0 THEN
        UPDATE League
        SET playerCount = playerCount - 1
        WHERE leagueId = OLD.leagueId;
    END IF;
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER price_change_monitor
AFTER INSERT ON ArtistStats
FOR EACH ROW
BEGIN
    DECLARE old_price INT;
    DECLARE price_change DECIMAL(10,2);
    
    SELECT price INTO old_price
    FROM ArtistStats
    WHERE artistId = NEW.artistId
    AND ((year = NEW.year AND month = NEW.month - 1) OR 
         (year = NEW.year - 1 AND month = 12 AND NEW.month = 1))
    ORDER BY year DESC, month DESC
    LIMIT 1;
    
    IF old_price IS NOT NULL THEN
        SET price_change = ((NEW.price - old_price) / old_price) * 100;
    END IF;
END //
DELIMITER ;