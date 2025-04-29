# config.py
# class Config:
#     # 数据库配置
#     MYSQL_HOST = 'localhost'
#     MYSQL_USER = 'root'
#     MYSQL_PASSWORD = ''  # 设置您的数据库密码
#     MYSQL_DB = 'music_fantasy_league'
#     MYSQL_CURSORCLASS = 'DictCursor'
    
#     # 应用配置
#     SECRET_KEY = 'your_secret_key_here'  # 用于会话安全的密钥
#     DEBUG = True

import os

class Config:
    MYSQL_HOST = os.getenv("MYSQL_HOST", "34.29.70.228")
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "cs411sucksass")
    MYSQL_DB = os.getenv("MYSQL_DB", "music_fantasy_league")
    MYSQL_CURSORCLASS = 'DictCursor'

