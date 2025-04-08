from flask import Flask, request, jsonify
from flask_mysqldb import MySQL
from flask_cors import CORS
import os
from config import Config

app = Flask(__name__)
app.config.from_object(Config) 
CORS(app) 

mysql = MySQL(app)

@app.route('/api/create_player', methods=['POST'])
def create_player():
    data = request.json
    player_name = data.get('player_name')
    username = data.get('username')
    password = data.get('password')

    cursor = mysql.connection.cursor()
    cursor.execute(
        "INSERT INTO Player (playerName, username, password) VALUES (%s, %s, %s)",
        (player_name, username, password)
    )
    mysql.connection.commit()

    return jsonify({"message": "Player account created successfully!"})

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
    cursor.execute("DELETE FROM Player WHERE playerId = %s", (player_id,))
    mysql.connection.commit()
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


if __name__ == '__main__':
    app.run(debug=True)