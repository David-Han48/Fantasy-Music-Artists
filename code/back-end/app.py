from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 

app.config["SQLALCHEMY_DATABASE_URI"] = (
    "mysql+pymysql://<USERNAME>:<PASSWORD>@127.0.0.1:3306/<DB_NAME>"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

@app.route("/api/test")
def test():
    return jsonify({"message": "Hello from Flask!"})