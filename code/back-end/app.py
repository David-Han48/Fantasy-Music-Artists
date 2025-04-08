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

if __name__ == '__main__':
    app.run(debug=True)