from flask import Flask, request, jsonify
from flask_mysqldb import MySQL
from flask_cors import CORS
import os
from config import Config

app = Flask(__name__)
app.config.from_object(Config) 
CORS(app) 

mysql = MySQL(app)

from calendar import month_name

@app.route('/api/current-date', methods=['GET'])
def get_current_date():
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("SELECT current_month, current_year FROM GameSettings WHERE id = 1")
        settings = cursor.fetchone()
        
        if not settings:
            # Initialize if first time
            current_month, current_year = 1, 2024
            cursor.execute(
                "INSERT INTO GameSettings (id, current_month, current_year) VALUES (1, %s, %s)",
                (current_month, current_year)
            )
            mysql.connection.commit()
        else:
            current_month, current_year = settings['current_month'], settings['current_year']
        
        return jsonify({
            "month": current_month,
            "year": current_year,
            "month_name": month_name[current_month]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()


@app.route('/api/create_player', methods=['POST'])
def create_player():
    data = request.json
    player_name = data.get('player_name')
    username = data.get('username')
    password = data.get('password')
    
    if not all([player_name, username, password]):
        return jsonify({"error": "All fields are required"}), 400
    
    cursor = mysql.connection.cursor()
    
    cursor.execute("SELECT * FROM Player WHERE username = %s", (username,))
    existing_user = cursor.fetchone()
    if existing_user:
        return jsonify({"error": "Username already exists"}), 409
    
    cursor.execute(
        "INSERT INTO Player (playerName, username, password) VALUES (%s, %s, %s)",
        (player_name, username, password)
    )
    mysql.connection.commit()
    
    player_id = cursor.lastrowid
    cursor.close()
    
    return jsonify({
        "message": "Player account created successfully!",
        "playerId": player_id
    })

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not all([username, password]):
        return jsonify({"error": "Username and password are required"}), 400
    
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT playerId, playerName, username FROM Player WHERE username = %s AND password = %s", 
                 (username, password))
    player = cursor.fetchone()
    cursor.close()
    
    if player:
        return jsonify({
            "message": "Login successful",
            "player": player
        })
    else:
        return jsonify({"error": "Invalid username or password"}), 401

@app.route('/api/get_players', methods=['GET'])
def get_players():
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT playerId, playerName, username FROM Player")
    players = cursor.fetchall()
    cursor.close()
    return jsonify(players)

@app.route('/api/delete_player/<int:player_id>', methods=['DELETE'])
def delete_player(player_id):
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM Player WHERE playerId = %s", (player_id,))
    player = cursor.fetchone()
    
    if not player:
        return jsonify({"error": "Player not found"}), 404
    
    try:
        cursor.execute("START TRANSACTION")
    
        cursor.execute("""
            DELETE rm FROM RosterMember rm
            JOIN Roster r ON rm.rosterId = r.rosterId
            WHERE r.playerId = %s
        """, (player_id,))
        
        cursor.execute("DELETE FROM Roster WHERE playerId = %s", (player_id,))
        
        cursor.execute("UPDATE League SET ownerId = NULL WHERE ownerId = %s", (player_id,))
        
        cursor.execute("DELETE FROM Player WHERE playerId = %s", (player_id,))
        
        mysql.connection.commit()
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

    return jsonify({"message": f"Player with ID {player_id} deleted successfully!"})

@app.route('/api/update_password/<int:player_id>', methods=['POST'])
def update_password(player_id):
    data = request.json
    new_password = data.get('new_password')

    if not new_password:
        return jsonify({"error": "New password is required"}), 400

    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM Player WHERE playerId = %s", (player_id,))
    player = cursor.fetchone()

    if not player:
        return jsonify({"error": "Player not found"}), 404
    
    cursor.execute("UPDATE Player SET password = %s WHERE playerId = %s", (new_password, player_id))
    mysql.connection.commit()
    cursor.close()

    return jsonify({"message": "Password updated successfully!"})


@app.route('/api/leagues', methods=['GET'])
def get_leagues():
    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT l.leagueId, l.leagueName, l.playerCount, l.ownerId, p.playerName as ownerName
        FROM League l
        LEFT JOIN Player p ON l.ownerId = p.playerId
    """)
    leagues = cursor.fetchall()
    cursor.close()
    return jsonify(leagues)

@app.route('/api/leagues/<int:league_id>', methods=['GET'])
def get_league(league_id):
    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT l.leagueId, l.leagueName, l.playerCount, l.ownerId, p.playerName as ownerName
        FROM League l
        LEFT JOIN Player p ON l.ownerId = p.playerId
        WHERE l.leagueId = %s
    """, (league_id,))
    league = cursor.fetchone()
    
    if not league:
        return jsonify({"error": "League not found"}), 404
    
    cursor.close()
    return jsonify(league)

@app.route('/api/leagues', methods=['POST'])
def create_league():
    data = request.json
    league_name = data.get('leagueName')
    owner_id = data.get('ownerId')
    
    if not league_name:
        return jsonify({"error": "League name is required"}), 400
    
    cursor = mysql.connection.cursor()
    
    if owner_id:
        cursor.execute("SELECT * FROM Player WHERE playerId = %s", (owner_id,))
        owner = cursor.fetchone()
        if not owner:
            cursor.close()
            return jsonify({"error": "Owner not found"}), 404
    
    try:
        cursor.execute("START TRANSACTION")
        
        # Create the league
        cursor.execute(
            "INSERT INTO League (leagueName, playerCount, ownerId) VALUES (%s, %s, %s)",
            (league_name, 1 if owner_id else 0, owner_id)
        )
        league_id = cursor.lastrowid
        
        # If there's an owner, create a roster for them
        if owner_id:
            default_roster_name = f"{owner['playerName']}'s Roster"
            default_budget = 2000
            
            cursor.execute(
                "INSERT INTO Roster (rosterName, budget, points, playerId, leagueId) VALUES (%s, %s, %s, %s, %s)",
                (default_roster_name, default_budget, 0, owner_id, league_id)
            )
        
        mysql.connection.commit()
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
    
    return jsonify({
        "message": "League created successfully!",
        "leagueId": league_id
    })

@app.route('/api/leagues/<int:league_id>/join', methods=['POST'])
def join_league(league_id):
    data = request.json
    player_id = data.get('playerId')
    
    if not player_id:
        return jsonify({"error": "Player ID is required"}), 400
    
    cursor = mysql.connection.cursor()
    
    try:
        cursor.execute("START TRANSACTION")
        
        # Check if league exists
        cursor.execute("SELECT * FROM League WHERE leagueId = %s", (league_id,))
        league = cursor.fetchone()
        if not league:
            return jsonify({"error": "League not found"}), 404
        
        # Check if player exists
        cursor.execute("SELECT * FROM Player WHERE playerId = %s", (player_id,))
        player = cursor.fetchone()
        if not player:
            return jsonify({"error": "Player not found"}), 404
        
        # Check if player already has a roster in this league
        cursor.execute("SELECT * FROM Roster WHERE playerId = %s AND leagueId = %s", (player_id, league_id))
        existing_roster = cursor.fetchone()
        if existing_roster:
            return jsonify({"error": "Player already has a roster in this league"}), 409
        
        # Create roster for the player
        default_roster_name = f"{player['playerName']}'s Roster"
        default_budget = 2000 
        
        cursor.execute(
            "INSERT INTO Roster (rosterName, budget, points, playerId, leagueId) VALUES (%s, %s, %s, %s, %s)",
            (default_roster_name, default_budget, 0, player_id, league_id)
        )
        
        # Update league player count
        cursor.execute("UPDATE League SET playerCount = playerCount + 1 WHERE leagueId = %s", (league_id,))
        
        mysql.connection.commit()
        
        return jsonify({
            "message": "Successfully joined the league and roster created!",
            "rosterId": cursor.lastrowid
        })
        
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.route('/api/leagues/<int:league_id>/leave', methods=['POST'])
def leave_league(league_id):
    data = request.json
    player_id = data.get('playerId')
    
    if not player_id:
        return jsonify({"error": "Player ID is required"}), 400
    
    cursor = mysql.connection.cursor()
    
    try:
        cursor.execute("START TRANSACTION")
        
        # Check if league exists
        cursor.execute("SELECT * FROM League WHERE leagueId = %s", (league_id,))
        league = cursor.fetchone()
        if not league:
            return jsonify({"error": "League not found"}), 404
        
        # Check if player is in the league
        cursor.execute("SELECT * FROM Roster WHERE playerId = %s AND leagueId = %s", (player_id, league_id))
        rosters = cursor.fetchall()
        
        if not rosters:
            return jsonify({"error": "Player is not in this league"}), 404
        
        # If the player is the owner, delete all rosters in the league
        if league['ownerId'] == player_id:
            # Delete all roster members in the league
            cursor.execute("""
                DELETE rm FROM RosterMember rm
                JOIN Roster r ON rm.rosterId = r.rosterId
                WHERE r.leagueId = %s
            """, (league_id,))
            
            # Delete all rosters in the league
            cursor.execute("DELETE FROM Roster WHERE leagueId = %s", (league_id,))
            
            # If there are other players, transfer ownership to the first player
            cursor.execute("""
                SELECT r.playerId 
                FROM Roster r 
                WHERE r.leagueId = %s 
                LIMIT 1
            """, (league_id,))
            new_owner = cursor.fetchone()
            
            if new_owner:
                cursor.execute("UPDATE League SET ownerId = %s WHERE leagueId = %s", 
                             (new_owner['playerId'], league_id))
            else:
                # If no players remain, delete the league
                cursor.execute("DELETE FROM League WHERE leagueId = %s", (league_id,))
        else:
            # If the player is not the owner, delete only their rosters
            cursor.execute("""
                DELETE rm FROM RosterMember rm
                JOIN Roster r ON rm.rosterId = r.rosterId
                WHERE r.playerId = %s AND r.leagueId = %s
            """, (player_id, league_id))
            
            cursor.execute("DELETE FROM Roster WHERE playerId = %s AND leagueId = %s", 
                         (player_id, league_id))
        
        # Update league player count
        cursor.execute("UPDATE League SET playerCount = playerCount - 1 WHERE leagueId = %s", (league_id,))
        
        mysql.connection.commit()
        
        return jsonify({"message": "Successfully left the league!"})
        
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.route('/api/standings/<int:league_id>', methods=['GET'])
def get_standings(league_id):
    cursor = mysql.connection.cursor()
    
    try:
        # Verify league exists
        cursor.execute("SELECT * FROM League WHERE leagueId = %s", (league_id,))
        league = cursor.fetchone()
        if not league:
            return jsonify({"error": "League not found"}), 404
        
        # Get current standings with points
        cursor.execute("""
            SELECT 
                p.playerId,
                p.playerName,
                r.points,
                r.rosterId
            FROM Roster r
            JOIN Player p ON r.playerId = p.playerId
            WHERE r.leagueId = %s
            ORDER BY r.points DESC
        """, (league_id,))
        
        standings = cursor.fetchall()
        
        return jsonify(standings)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()


@app.route('/api/rosters', methods=['GET'])
def get_rosters():
    player_id = request.args.get('playerId')
    
    if not player_id:
        return jsonify({"error": "Player ID is required"}), 400
    
    cursor = mysql.connection.cursor()
    
    try:
        # Get all rosters for the player with league information
        cursor.execute("""
            SELECT r.rosterId, r.rosterName, r.budget, r.points, 
                   r.playerId, r.leagueId, l.leagueName
            FROM Roster r
            JOIN League l ON r.leagueId = l.leagueId
            WHERE r.playerId = %s
            ORDER BY l.leagueName, r.rosterName
        """, (player_id,))
        
        rosters = cursor.fetchall()
        
        return jsonify(rosters)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.route('/api/rosters', methods=['POST'])
def create_roster():
    data = request.json
    roster_name = data.get('rosterName')
    player_id = data.get('playerId')
    league_id = data.get('leagueId')
    
    if not all([roster_name, player_id, league_id]):
        return jsonify({"error": "Roster name, player ID, and league ID are required"}), 400
    
    cursor = mysql.connection.cursor()
    
    cursor.execute("SELECT * FROM Player WHERE playerId = %s", (player_id,))
    player = cursor.fetchone()
    if not player:
        return jsonify({"error": "Player not found"}), 404
    
    cursor.execute("SELECT * FROM League WHERE leagueId = %s", (league_id,))
    league = cursor.fetchone()
    if not league:
        return jsonify({"error": "League not found"}), 404
    
    cursor.execute("SELECT * FROM Roster WHERE playerId = %s AND leagueId = %s", (player_id, league_id))
    existing_roster = cursor.fetchone()
    if existing_roster:
        return jsonify({"error": "Player already has a roster in this league"}), 409
    
    default_budget = 2000 
    cursor.execute(
        "INSERT INTO Roster (rosterName, budget, points, playerId, leagueId) VALUES (%s, %s, %s, %s, %s)",
        (roster_name, default_budget, 0, player_id, league_id)
    )
    mysql.connection.commit()
    
    roster_id = cursor.lastrowid
    
    cursor.execute("SELECT COUNT(*) as roster_count FROM Roster WHERE playerId = %s AND leagueId = %s", 
                 (player_id, league_id))
    roster_count = cursor.fetchone()['roster_count']
    
    if roster_count == 1:
        cursor.execute("UPDATE League SET playerCount = playerCount + 1 WHERE leagueId = %s", (league_id,))
        mysql.connection.commit()
    
    cursor.close()
    
    return jsonify({
        "message": "Roster created successfully!",
        "rosterId": roster_id
    })

@app.route('/api/rosters/<int:roster_id>', methods=['GET'])
def get_roster(roster_id):
    cursor = mysql.connection.cursor()
    
    cursor.execute("""
        SELECT r.rosterId, r.rosterName, r.budget, r.points, r.playerId, r.leagueId,
               p.playerName, l.leagueName
        FROM Roster r
        JOIN Player p ON r.playerId = p.playerId
        JOIN League l ON r.leagueId = l.leagueId
        WHERE r.rosterId = %s
    """, (roster_id,))
    
    roster = cursor.fetchone()
    
    if not roster:
        return jsonify({"error": "Roster not found"}), 404
    
    cursor.close()
    
    return jsonify(roster)

@app.route('/api/rosters/<int:roster_id>', methods=['DELETE'])
def delete_roster(roster_id):
    cursor = mysql.connection.cursor()
    
    cursor.execute("SELECT * FROM Roster WHERE rosterId = %s", (roster_id,))
    roster = cursor.fetchone()
    
    if not roster:
        return jsonify({"error": "Roster not found"}), 404
    
    try:
        cursor.execute("START TRANSACTION")
        
        cursor.execute("DELETE FROM RosterMember WHERE rosterId = %s", (roster_id,))
        
        cursor.execute("DELETE FROM Roster WHERE rosterId = %s", (roster_id,))
        
        cursor.execute("SELECT COUNT(*) as roster_count FROM Roster WHERE playerId = %s AND leagueId = %s", 
                     (roster['playerId'], roster['leagueId']))
        roster_count = cursor.fetchone()['roster_count']
        
        if roster_count == 0:
            cursor.execute("UPDATE League SET playerCount = playerCount - 1 WHERE leagueId = %s", 
                         (roster['leagueId'],))
            
            cursor.execute("SELECT playerCount FROM League WHERE leagueId = %s", (roster['leagueId'],))
            player_count = cursor.fetchone()['playerCount']
            
            if player_count <= 0:
                cursor.execute("DELETE FROM League WHERE leagueId = %s", (roster['leagueId'],))
        
        mysql.connection.commit()
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    
    cursor.close()
    
    return jsonify({"message": "Roster deleted successfully!"})


@app.route('/api/artists/search', methods=['GET'])
def search_artists():
    search_term = request.args.get('term', '')
    
    if not search_term or len(search_term) < 2:
        return jsonify({"error": "Search term must be at least 2 characters"}), 400
    
    cursor = mysql.connection.cursor()
    
    try:
        # First get the current game month/year
        cursor.execute("SELECT current_month, current_year FROM GameSettings WHERE id = 1")
        date_settings = cursor.fetchone()
        if not date_settings:
            return jsonify({"error": "Game settings not initialized"}), 500
        
        current_month = date_settings['current_month']
        current_year = date_settings['current_year']
        
        # Search artists with stats for current month/year
        cursor.execute("""
            SELECT 
                a.artistId, 
                a.artistName, 
                s.price, 
                s.listeners, 
                s.followers, 
                s.popularity,
                s.month,
                s.year
            FROM Artist a
            JOIN ArtistStats s ON a.artistId = s.artistId
            WHERE a.artistName LIKE %s
              AND s.month = %s
              AND s.year = %s
            LIMIT 15
        """, (f'%{search_term}%', current_month, current_year))
        
        artists = cursor.fetchall()
        
        return jsonify(artists)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.route('/api/artists/<int:artist_id>', methods=['GET'])
def get_artist(artist_id):
    cursor = mysql.connection.cursor()
    
    try:
        # Get current game month/year
        cursor.execute("SELECT current_month, current_year FROM GameSettings WHERE id = 1")
        date_settings = cursor.fetchone()
        if not date_settings:
            return jsonify({"error": "Game settings not initialized"}), 500
        
        current_month = date_settings['current_month']
        current_year = date_settings['current_year']
        
        # Get artist with current month's stats
        # Advanced #1
        cursor.execute("""
            SELECT 
            a.artistId, 
            a.artistName, 
            s.price, 
            s.listeners, 
            s.followers, 
            s.popularity,
            s.month,
            s.year
        FROM Artist a
        JOIN (
            SELECT 
                s.*,
                RANK() OVER (PARTITION BY artistId ORDER BY year DESC, month DESC) as recency_rank
            FROM ArtistStats s
            WHERE s.artistId = %s
        ) s ON a.artistId = s.artistId
        WHERE a.artistId = %s
        AND s.month = %s
        AND s.year = %s
        AND s.recency_rank = 1  -- Still gets same row as original
    """, (artist_id, artist_id, current_month, current_year))
        
        artist = cursor.fetchone()
        
        if not artist:
            return jsonify({"error": "Artist not found for current period"}), 404
        
        return jsonify(artist)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.route('/api/rosters/<int:roster_id>/artists', methods=['GET'])
def get_roster_artists(roster_id):
    cursor = mysql.connection.cursor()
    
    # First get the current month/year
    cursor.execute("SELECT current_month, current_year FROM GameSettings WHERE id = 1")
    date_settings = cursor.fetchone()
    if not date_settings:
        cursor.close()
        return jsonify({"error": "Game settings not initialized"}), 500
        
    current_month = date_settings['current_month']
    current_year = date_settings['current_year']
    
    # Verify roster exists
    cursor.execute("SELECT * FROM Roster WHERE rosterId = %s", (roster_id,))
    roster = cursor.fetchone()
    if not roster:
        cursor.close()
        return jsonify({"error": "Roster not found"}), 404
        
    # Get artists with stats for CURRENT month/year
    # Advanced #2
    cursor.execute("""
        SELECT 
            a.artistId, 
            a.artistName, 
            s.price, 
            s.listeners, 
            s.followers, 
            s.popularity,
            s.month,
            s.year
        FROM Artist a
        JOIN ArtistStats s ON a.artistId = s.artistId
        WHERE EXISTS (
            SELECT 1 FROM RosterMember rm 
            WHERE rm.rosterId = %s 
            AND rm.artistId = a.artistId
        )
        AND s.month = %s
        AND s.year = %s
        AND a.artistId IN (
            SELECT artistId 
            FROM RosterMember 
            WHERE rosterId = %s
            GROUP BY artistId
            HAVING COUNT(*) = 1  -- Ensures no duplicates
        )
    """, (roster_id, current_month, current_year, roster_id))
    
    artists = cursor.fetchall()
    cursor.close()
    
    return jsonify(artists)

@app.route('/api/rosters/<int:roster_id>/artists', methods=['POST'])
def add_artist_to_roster(roster_id):
    data = request.json
    artist_id = data.get('artistId')
    
    if not artist_id:
        return jsonify({"error": "Artist ID is required"}), 400
    
    cursor = mysql.connection.cursor()
    
    cursor.execute("SELECT * FROM Roster WHERE rosterId = %s", (roster_id,))
    roster = cursor.fetchone()
    
    if not roster:
        return jsonify({"error": "Roster not found"}), 404
    
    cursor.execute("""
        SELECT a.artistId, a.artistName, 
               s.price, s.listeners, s.followers, s.popularity
        FROM Artist a
        JOIN ArtistStats s ON a.artistId = s.artistId
        WHERE a.artistId = %s
              AND s.month = (SELECT MAX(month) FROM ArtistStats WHERE artistId = a.artistId)
              AND s.year = (SELECT MAX(year) FROM ArtistStats WHERE artistId = a.artistId AND month = s.month)
    """, (artist_id,))
    
    artist = cursor.fetchone()
    
    if not artist:
        return jsonify({"error": "Artist not found"}), 404
    
    cursor.execute("SELECT * FROM RosterMember WHERE rosterId = %s AND artistId = %s", 
                 (roster_id, artist_id))
    existing = cursor.fetchone()
    
    if existing:
        return jsonify({"error": "Artist is already in the roster"}), 409
    
    if roster['budget'] < artist['price']:
        return jsonify({"error": "Not enough budget to add this artist"}), 400
    
    try:
        cursor.callproc('AddArtistToRoster', [roster_id, artist_id])
        mysql.connection.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    cursor.close()
    
    return jsonify({
        "message": "Artist added to roster successfully!",
        "artistId": artist_id,
        "rosterId": roster_id
    })

@app.route('/api/rosters/<int:roster_id>/artists/<int:artist_id>', methods=['DELETE'])
def remove_artist_from_roster(roster_id, artist_id):
    cursor = mysql.connection.cursor()
    
    cursor.execute("SELECT * FROM Roster WHERE rosterId = %s", (roster_id,))
    roster = cursor.fetchone()
    
    if not roster:
        return jsonify({"error": "Roster not found"}), 404
    
    cursor.execute("SELECT * FROM RosterMember WHERE rosterId = %s AND artistId = %s", 
                 (roster_id, artist_id))
    member = cursor.fetchone()
    
    if not member:
        return jsonify({"error": "Artist is not in the roster"}), 404
    
    cursor.execute("""
        SELECT s.price
        FROM ArtistStats s
        WHERE s.artistId = %s
              AND s.month = (SELECT MAX(month) FROM ArtistStats WHERE artistId = s.artistId)
              AND s.year = (SELECT MAX(year) FROM ArtistStats WHERE artistId = s.artistId AND month = s.month)
    """, (artist_id,))
    
    artist_stats = cursor.fetchone()
    
    try:
        cursor.callproc('RemoveArtistFromRoster', [roster_id, artist_id])
        mysql.connection.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    cursor.close()
    
    return jsonify({
        "message": "Artist removed from roster successfully!",
        "refundAmount": artist_stats['price'] if artist_stats else 0
    })

@app.route('/api/advance-month', methods=['POST'])
def advance_month():
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("START TRANSACTION")
        
        # Get current date
        cursor.execute("SELECT current_month, current_year FROM GameSettings WHERE id = 1 FOR UPDATE")
        settings = cursor.fetchone()
        
        if not settings:
            raise Exception("Game settings not initialized")
        
        current_month, current_year = settings['current_month'], settings['current_year']
        
        # Calculate next month
        if current_month == 12:
            next_month = 1
            next_year = current_year + 1
        else:
            next_month = current_month + 1
            next_year = current_year
        
        # Update rosters using CURRENT month's stats (not next month)
        update_query = """
        UPDATE Roster r
        JOIN (
            SELECT rm.rosterId, 
                   SUM(s.popularity) AS total_pop,
                   SUM(s.price) AS total_value
            FROM RosterMember rm
            JOIN ArtistStats s ON rm.artistId = s.artistId
            WHERE s.month = %s AND s.year = %s
            GROUP BY rm.rosterId
        ) stats ON r.rosterId = stats.rosterId
        SET 
            r.points = r.points + (stats.total_pop * 0.1),
            r.budget = r.budget + (stats.total_value * 0.05)
        """
        cursor.execute(update_query, (current_month, current_year))
        
        # Update game date to next month
        cursor.execute(
            "UPDATE GameSettings SET current_month = %s, current_year = %s WHERE id = 1",
            (next_month, next_year)
        )
        
        mysql.connection.commit()
        
        return jsonify({
            "message": f"Advanced to {month_name[next_month]} {next_year}",
            "month": next_month,
            "year": next_year,
            "month_name": month_name[next_month]
        })
        
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)