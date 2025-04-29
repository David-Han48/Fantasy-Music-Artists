import os

class Config:
    MYSQL_HOST = os.getenv("MYSQL_HOST", "34.29.70.228")
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "cs411sucksass")
    MYSQL_DB = os.getenv("MYSQL_DB", "music_fantasy_league")
    MYSQL_CURSORCLASS = 'DictCursor'

