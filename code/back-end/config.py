import os

class Config:
    MYSQL_HOST = os.getenv("MYSQL_HOST", "your-host")
    MYSQL_USER = os.getenv("MYSQL_USER", "cs411")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "cs411sucksass")
    MYSQL_DB = os.getenv("MYSQL_DB", "your-database-name")
    MYSQL_CURSORCLASS = 'DictCursor'