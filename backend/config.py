import os
import datetime
import redis
from pymongo import MongoClient, collection
from flask import Flask
from flask_cors import CORS
import secrets

class AppConfig:
    def __init__(self):
        self.r = self.create_redis_connection()
        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = secrets.token_hex(32)
        self.configure_cors()
        self.configure_mongo()

    def is_docker(self):
        try:
            if os.path.exists('/.dockerenv'):
                return True
            with open('/proc/1/cgroup', 'r') as f:
                if 'docker' in f.read():
                    return True
            return False
        except Exception:
            return False

    def create_redis_connection(self):
        try:
            redis_cloud_host = os.getenv("REDIS_CLOUD_HOST", None)
            redis_cloud_password = os.getenv("REDIS_CLOUD_PASSWORD", None)
            if redis_cloud_host and redis_cloud_password:
                print("✅ Using Redis Cloud configuration (Free tier - 30MB).")
                r = redis.Redis(
                    host=redis_cloud_host,
                    port=15355,
                    username="default",
                    password=redis_cloud_password,
                )
            else:
                host = "redis" if self.is_docker() else "localhost"
                print(f"✅ Detected {'Docker' if self.is_docker() else 'Host'} environment.")
                r = redis.Redis(host=host, port=6379)
            
            if r.ping():
                print("✅ Redis connection successful.")
            else:
                print("⚠️ Redis server is not responding.")
                r = None     
        except Exception as e:
            print("⚠️ Warning: Redis connection failed:", e)
            r = None
        return r

    def configure_cors(self):
        cors_origins = os.getenv("REACT_APP_DOMAIN", "http://localhost")
        if cors_origins.startswith('https'):
            CORS(self.app, origins=[cors_origins],supports_credentials=True)
        else:
            CORS(self.app,supports_credentials=True)

    def configure_mongo(self):
        connection = os.getenv("MONGO_CONNECTION_STRING", "").strip()
        if not connection:
            raise ValueError("MONGO_CONNECTION_STRING environment variable must be set")
        
        self.client = MongoClient(connection)
        self.db = self.client.dietmate
        self.collection1: collection.Collection = self.db['GPT']