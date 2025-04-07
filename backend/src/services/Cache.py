import datetime
import json
import logging

def setup_logger(name):
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger

class CacheService:
    def __init__(self, redis_client, mongo_collection, cache_ttl=3600):
        self.redis_client = redis_client
        self.mongo_collection = mongo_collection
        self.cache_ttl = cache_ttl
        self.logger = setup_logger(__name__)
        self.mongo_collection.create_index("expires_at", expireAfterSeconds=0)

    def get_value(self, session_id, key):
        cache_key = f"{session_id}:{key}"
        cached_value = self.redis_client.get(cache_key)
        if cached_value:
            self.logger.info(f"Cache hit for {cache_key}")
            return cached_value.decode('utf-8')
        self.logger.info(f"Cache miss for {cache_key}, fetching from MongoDB")
        result = self.mongo_collection.find_one({"session_id": session_id, "key": key})
        if result:
            value = result.get("value")
            self.redis_client.setex(cache_key, self.cache_ttl, value)
            return value
        return None

    def set_value(self, session_id, key, value):
        now = datetime.datetime.utcnow()
        expires_at = now + datetime.timedelta(seconds=self.cache_ttl)
        self.mongo_collection.update_one(
            {"session_id": session_id, "key": key},
            {"$set": {"value": value, "updated_at": now, "expires_at": expires_at}},
            upsert=True
        )
        cache_key = f"{session_id}:{key}"
        self.redis_client.setex(cache_key, self.cache_ttl, value)
        return True

    def get_set(self, session_id, set_name):
        redis_key = f"set:{session_id}:{set_name}"
        cached = self.redis_client.get(redis_key)
        if cached:
            self.logger.info(f"Cache hit for set {redis_key}")
            return json.loads(cached.decode('utf-8'))
        self.logger.info(f"Cache miss for set {redis_key}, fetching from MongoDB")
        doc = self.mongo_collection.find_one({"session_id": session_id, "set_name": set_name})
        if doc:
            values = doc.get("values", [])
            self.redis_client.setex(redis_key, self.cache_ttl, json.dumps(values))
            return values
        return []

    def add_to_set(self, session_id, set_name, value):
        now = datetime.datetime.utcnow()
        self.mongo_collection.update_one(
            {"session_id": session_id, "set_name": set_name},
            {"$addToSet": {"values": value}, "$set": {"updated_at": now}},
            upsert=True
        )
        redis_key = f"set:{session_id}:{set_name}"
        self.redis_client.delete(redis_key)
        return True

    def update_in_set(self, session_id, set_name, old_value, new_value):
        now = datetime.datetime.utcnow()
        self.mongo_collection.update_one(
            {"session_id": session_id, "set_name": set_name},
            {"$pull": {"values": old_value}}
        )
        self.mongo_collection.update_one(
            {"session_id": session_id, "set_name": set_name},
            {"$addToSet": {"values": new_value}, "$set": {"updated_at": now}},
            upsert=True
        )
        redis_key = f"set:{session_id}:{set_name}"
        self.redis_client.delete(redis_key)
        return True

    def delete_from_set(self, session_id, set_name, value):
        now = datetime.datetime.utcnow()
        self.mongo_collection.update_one(
            {"session_id": session_id, "set_name": set_name},
            {"$pull": {"values": value}, "$set": {"updated_at": now}}
        )
        redis_key = f"set:{session_id}:{set_name}"
        self.redis_client.delete(redis_key)
        return True
