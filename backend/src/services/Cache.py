import datetime
import json
import logging
import threading
import time
import queue
from redis.commands.search.query import Query

def setup_logger(name):
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger

class DateTimeEncoder(json.JSONEncoder):
    """Klasa do serializacji obiektów datetime do JSON."""
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        return super().default(obj)

class CacheService:
    def __init__(self, redis_client, mongo_collection, cache_ttl=0, flush_interval=60):
        self.redis_client = redis_client
        self.mongo_collection = mongo_collection
        self.cache_ttl = cache_ttl
        self.logger = setup_logger(__name__)
        self.flush_interval = flush_interval  # Interwał zapisywania do MongoDB (w sekundach)
        self.dirty_keys = set()  # Zbiór kluczy czekających na zapis do MongoDB
        self.write_lock = threading.Lock()  # Blokada dla operacji zapisu
        self.operation_queue = queue.Queue()  # Kolejka operacji do wykonania w MongoDB

        self.running = True
        
        # Utworzenie indeksów MongoDB
        try:
            self.mongo_collection.create_index("expires_at", expireAfterSeconds=0)
        except Exception as e:
            self.logger.info(f"Index 'expires_at' might already exist: {e}")
            
        try:
            self.mongo_collection.create_index(
                [("session_id", 1), ("key", 1)], 
                unique=True,
                partialFilterExpression={"key": {"$type": "string"}},
                name="session_id_key_partial_filter"
            )
        except Exception as e:
            self.logger.info(f"Index 'session_id_key_partial_filter' might already exist: {e}")
            
        try:
            self.mongo_collection.drop_index("collection_type_1")
        except Exception as e:
            self.logger.info(f"MongoDB index drop error (normal if doesn't exist): {e}")
            
        try:
            self.mongo_collection.create_index("session_id")
        except Exception as e:
            self.logger.info(f"Index 'session_id_1' might already exist: {e}")
            
        try:
            self.mongo_collection.create_index("collection_type")
        except Exception as e:
            self.logger.info(f"Index 'collection_type_1' might already exist: {e}")
        
        try:
            self.redis_client.ft().create_index([
                {"name": "session_id", "type": "TEXT", "sortable": True},
                {"name": "set_name", "type": "TEXT", "sortable": True},
                {"name": "value", "type": "TEXT", "sortable": True}
            ], definition=None)
        except Exception as e:
            self.logger.info(f"Index in Redis might already exist: {e}")
            
        # Uruchomienie wątku zapisującego dane do MongoDB
        self.flush_thread = threading.Thread(target=self._background_flush, daemon=True)
        self.flush_thread.start()
        
        # Flaga do zatrzymania wątku
        self.running = True

    def __del__(self):
        """Metoda wywoływana przy usuwaniu instancji - zapewnia zapisanie wszystkich danych."""
        self.running = False
        self.flush_all()
    
    def _background_flush(self):
        """
        Wątek tła, który okresowo zapisuje dane z Redis do MongoDB.
        """
        while self.running:
            time.sleep(self.flush_interval)
            self.flush_all()

    def flush_all(self):
        """
        Synchronizuje wszystkie 'brudne' klucze z Redis do MongoDB.
        
        Metoda pobiera listę kluczy wymagających synchronizacji i zapisuje
        ich aktualny stan do bazy danych MongoDB.
        """
        if not self.dirty_keys:
            return
        
        # Utwórz kopię brudnych kluczy przed modyfikacją
        with self.write_lock:
            keys_to_flush = self.dirty_keys.copy()
            self.dirty_keys.clear()
        
        successful_keys = []
        failed_keys = []
        
        self.logger.info(f"Flushing {len(keys_to_flush)} dirty keys to MongoDB...")
        
        for dirty_key in keys_to_flush:
            try:
                # Sprawdź typ klucza na podstawie prefiksu
                if dirty_key.startswith("set:"):
                    # Format: set:session_id:set_name
                    parts = dirty_key.split(':', 2)
                    if len(parts) == 3:
                        session_id = parts[1]
                        set_name = parts[2]
                        self._flush_set_value(session_id, set_name)
                        successful_keys.append(dirty_key)
                elif dirty_key.startswith("value:"):
                    # Format: value:session_id:key
                    parts = dirty_key.split(':', 2)
                    if len(parts) == 3:
                        session_id = parts[1]
                        key = parts[2]
                        self._flush_value(session_id, key)
                        successful_keys.append(dirty_key)
                else:
                    self.logger.warning(f"Unknown key format: {dirty_key}")
                    failed_keys.append(dirty_key)
            except Exception as e:
                self.logger.error(f"Error flushing key {dirty_key}: {e}")
                failed_keys.append(dirty_key)
        
        # Jeśli jakieś klucze nie zostały pomyślnie zapisane, dodaj je z powrotem do brudnych kluczy
        if failed_keys:
            with self.write_lock:
                self.dirty_keys.update(failed_keys)
            self.logger.warning(f"Failed to flush {len(failed_keys)} keys, they will be retried later")
            
        if successful_keys:
            self.logger.info(f"Successfully flushed {len(successful_keys)} keys to MongoDB")
        
        return len(successful_keys)


    def _flush_set_value(self, session_id, set_name):
        """
        Zapisuje zbiór z Redis do MongoDB.
        """
        # Klucze zbiorów
        set_key = f"set:{session_id}:{set_name}"
        hash_prefix = f"hash:{session_id}:{set_name}:"
        meta_key = f"meta:{session_id}:{set_name}"
        
        # Pobierz wszystkie elementy ze zbioru
        items = {}
        elements = self.redis_client.smembers(set_key)
        
        # Jeśli zbiór jest pusty, nie ma co zapisywać
        if not elements:
            return
        
        for value_bytes in elements:
            value = value_bytes.decode('utf-8')
            hash_key = f"{hash_prefix}{value}"
            
            # Pobierz metadane elementu z Hasha
            if self.redis_client.exists(hash_key):
                item_meta = self.redis_client.hgetall(hash_key)
                
                item_data = {
                    "count": int(item_meta.get(b'count', 1)),
                    "added_at": item_meta.get(b'added_at', datetime.datetime.utcnow().isoformat()).decode('utf-8'),
                    "last_updated": item_meta.get(b'last_updated', datetime.datetime.utcnow().isoformat()).decode('utf-8')
                }
                
                if b'expires_at' in item_meta:
                    item_data["expires_at"] = item_meta[b'expires_at'].decode('utf-8')
                
                items[value] = item_data
            else:
                # W przypadku braku metadanych utworzymy podstawowe
                items[value] = {
                    "count": 1,
                    "added_at": datetime.datetime.utcnow().isoformat(),
                    "last_updated": datetime.datetime.utcnow().isoformat()
                }
        
        # Zapisz do MongoDB
        now = datetime.datetime.utcnow()
        update_data = {
            "$set": {
                "session_id": session_id,
                "set_name": set_name,
                "items": items,
                "updated_at": now
            }
        }
        
        # Pobierz TTL z Redis i ustaw expires_at w MongoDB
        ttl = self.redis_client.ttl(set_key)
        if ttl > 0:
            # Utwórz datę wygaśnięcia na podstawie TTL z Redis
            expires_at = now + datetime.timedelta(seconds=ttl)
            update_data["$set"]["expires_at"] = expires_at
        else:
            # Jeśli klucz nie ma TTL w Redis, usuń ewentualne expires_at w MongoDB
            update_data["$unset"] = {"expires_at": ""}
        
        self.mongo_collection.update_one(
            {"session_id": session_id, "set_name": set_name},
            update_data,
            upsert=True
        )

    def _flush_value(self, session_id, key):
        """
        Zapisuje prostą wartość klucz-wartość z Redis do MongoDB.
        """
        cache_key = f"{session_id}:{key}"
        
        # Sprawdź czy klucz istnieje w Redis
        if not self.redis_client.exists(cache_key):
            # Klucz mógł wygasnąć, usuń go z MongoDB jeśli istnieje
            self.mongo_collection.delete_one({"session_id": session_id, "key": key})
            return
        
        # Pobierz wartość z Redis
        value = self.redis_client.get(cache_key)
        if value is None:
            return
        
        value_str = value.decode('utf-8')
        
        # Przygotuj dane do zapisu
        now = datetime.datetime.utcnow()
        update_data = {
            "$set": {
                "session_id": session_id,
                "key": key,
                "value": value_str,
                "updated_at": now
            }
        }
        
        # Pobierz TTL z Redis i ustaw expires_at w MongoDB
        ttl = self.redis_client.ttl(cache_key)
        if ttl > 0:
            # Utwórz datę wygaśnięcia na podstawie TTL z Redis
            expires_at = now + datetime.timedelta(seconds=ttl)
            update_data["$set"]["expires_at"] = expires_at
        else:
            # Jeśli klucz nie ma TTL w Redis, usuń ewentualne expires_at w MongoDB
            update_data["$unset"] = {"expires_at": ""}
        
        # Zapisz do MongoDB (upsert=True oznacza: zaktualizuj jeśli istnieje, w przeciwnym razie utwórz)
        self.mongo_collection.update_one(
            {"session_id": session_id, "key": key},
            update_data,
            upsert=True
        )
    
    def search_keys(self, session_id=None, pattern=None, set_name=None, limit=100, offset=0):
        """
        Wyszukuje klucze w pamięci podręcznej według podanych kryteriów.
        """
        query_parts = []

        if session_id:
            query_parts.append(f"@session_id:{session_id}")

        if set_name:
            query_parts.append(f"@set_name:{set_name}")

        if pattern:
            query_parts.append(f"@value:(?i){pattern}*")
            
        query = " ".join(query_parts) if query_parts else "*"
        
        self.logger.info(f"Searching Redis with query: '{query}'")
        
        try:
            try:
                results = self.redis_client.ft().search(query)[:limit]
            except Exception as inner_e:
                self.logger.error(f"Próba alternatywnego wywołania Redis Stack: {inner_e}")
                # Alternatywna składnia dla niektórych wersji Redis
                results = self.redis_client.ft().search(query, 0, limit)
                
            items = []
            for doc in results.docs:
                item = {
                    "session_id": doc.session_id,
                    "set_name": doc.set_name,
                    "value": doc.value,
                    "count": None
                }

                hash_key = f"hash:{doc.session_id}:{doc.set_name}:{doc.value}"
                if self.redis_client.exists(hash_key):
                    count_raw = self.redis_client.hget(hash_key, "count")
                    if count_raw:
                        try:
                            item["count"] = int(count_raw)
                        except Exception:
                            item["count"] = 1
                    else:
                        item["count"] = 1
                else:
                    item["count"] = 1

                items.append(item)

            return {
                "total": results.total,
                "items": items
            }

        except Exception as e:
            self.logger.error(f"Błąd wyszukiwania w Redis Stack: {e}")
            
            # Fallback do prostego wyszukiwania w Redis za pomocą scan
            search_pattern = f"search:{session_id or '*'}:{set_name or '*'}:*"
            keys = list(self.redis_client.scan_iter(match=search_pattern, count=1000))
            
            # Filtrowanie ręczne z ignorowaniem wielkości liter
            filtered_keys = []
            if pattern:
                pattern_lower = pattern.lower()
                for key in keys:
                    key_str = key.decode('utf-8')
                    parts = key_str.split(':', 3)
                    if len(parts) == 4 and parts[3].lower().startswith(pattern_lower):
                        filtered_keys.append(key)
            else:
                filtered_keys = keys
                
            # Zastosowanie paginacji
            total = len(filtered_keys)
            paginated_keys = filtered_keys[offset:offset+limit] if total > offset else []
            
            items = []
            for key in paginated_keys:
                key_str = key.decode('utf-8')
                parts = key_str.split(':', 3)
                if len(parts) == 4:
                    session_id_part, set_name_part, value_part = parts[1], parts[2], parts[3]
                    count = 1
                    hash_key = f"hash:{session_id_part}:{set_name_part}:{value_part}"
                    if self.redis_client.exists(hash_key):
                        count_raw = self.redis_client.hget(hash_key, "count")
                        if count_raw:
                            try:
                                count = int(count_raw)
                            except Exception:
                                count = 1

                    items.append({
                        "session_id": session_id_part,
                        "set_name": set_name_part,
                        "value": value_part,
                        "count": count
                    })

            return {
                "total": total,
                "items": items
            }
            
    def get_value(self, session_id, key):
        """
        Pobiera wartość dla klucza z cache (Redis).
        
        W przypadku braku w Redis, próbuje pobrać z MongoDB i zapisać w Redis.
        """
        cache_key = f"{session_id}:{key}"
        cached_value = self.redis_client.get(cache_key)
        if cached_value:
            self.logger.info(f"Cache hit for {cache_key}")
            return cached_value.decode('utf-8')
        
        # Cache miss - sprawdzamy w MongoDB
        self.logger.info(f"Cache miss for {cache_key}, fetching from MongoDB")
        result = self.mongo_collection.find_one({"session_id": session_id, "key": key})
        if result:
            value = result.get("value")
            # Zapisz w Redis
            if self.cache_ttl > 0:
                self.redis_client.setex(cache_key, self.cache_ttl, value)
            else:
                self.redis_client.set(cache_key, value)
            
            # Klucz jest już synchronizowany z MongoDB
            return value
        return None

    def set_value(self, session_id, key, value):
        """
        Zapisuje wartość tylko w Redis.
        
        Implementacja wzorca write-back - zapis do MongoDB jest opóźniony.
        """
        cache_key = f"{session_id}:{key}"
        dirty_key = f"value:{session_id}:{key}"
        
        if self.cache_ttl > 0:
            self.redis_client.setex(cache_key, self.cache_ttl, value)
        else:
            self.redis_client.set(cache_key, value)
        
        # Oznacz klucz jako "brudny" - wymaga zapisu do MongoDB
        with self.write_lock:
            self.dirty_keys.add(dirty_key)
        
        return True
    

    def get_set(self, session_id, set_name):
        """
        Pobiera zawartość zbioru z cache (Redis) lub źródła danych (MongoDB).
        """
        # Klucze dla Redis
        set_key = f"set:{session_id}:{set_name}"
        hash_prefix = f"hash:{session_id}:{set_name}:"
        
        # Sprawdź czy zbiór istnieje w Redis
        if self.redis_client.exists(set_key):
            self.logger.info(f"Cache hit for set {set_key}")
            
            # Pobierz wszystkie elementy ze zbioru
            elements = self.redis_client.smembers(set_key)
            items = {}
            
            for value_bytes in elements:
                value = value_bytes.decode('utf-8')
                hash_key = f"{hash_prefix}{value}"
                
                # Pobierz metadane elementu z Hasha
                if self.redis_client.exists(hash_key):
                    item_meta = self.redis_client.hgetall(hash_key)
                    
                    item_data = {
                        "count": int(item_meta.get(b'count', 1)),
                        "added_at": item_meta.get(b'added_at', datetime.datetime.utcnow().isoformat()).decode('utf-8'),
                        "last_updated": item_meta.get(b'last_updated', datetime.datetime.utcnow().isoformat()).decode('utf-8')
                    }
                    
                    if b'expires_at' in item_meta:
                        item_data["expires_at"] = item_meta[b'expires_at'].decode('utf-8')
                    
                    items[value] = item_data
                else:
                    # W przypadku braku metadanych utworzymy podstawowe
                    items[value] = {
                        "count": 1,
                        "added_at": datetime.datetime.utcnow().isoformat(),
                        "last_updated": datetime.datetime.utcnow().isoformat()
                    }
            
            return items
        
        # Cache miss - sprawdzamy w MongoDB
        self.logger.info(f"Cache miss for set {set_key}, fetching from MongoDB")
        query = {"session_id": session_id, "set_name": set_name}
            
        doc = self.mongo_collection.find_one(query)
        if doc:
            items = doc.get("items", {})
            
            # Zapisz w Redis używając natywnych struktur danych
            meta_key = f"meta:{session_id}:{set_name}"
            now = datetime.datetime.utcnow().isoformat()
            
            # Dodaj do zbioru i zapisz metadane dla każdego elementu
            pipe = self.redis_client.pipeline()
            
            for value, item_data in items.items():
                pipe.sadd(set_key, value)
                
                # Zapisz metadane elementu jako Hash
                hash_key = f"{hash_prefix}{value}"
                hash_data = {
                    "count": item_data.get("count", 1),
                    "added_at": item_data.get("added_at", now),
                    "last_updated": item_data.get("last_updated", now)
                }
                
                if "expires_at" in item_data:
                    hash_data["expires_at"] = item_data["expires_at"]
                
                pipe.hset(hash_key, mapping=hash_data)
            
            # Ustaw TTL dla wszystkich kluczy
            if self.cache_ttl > 0:
                keys_to_expire = [set_key, meta_key]
                keys_to_expire.extend([f"{hash_prefix}{value}" for value in items.keys()])
                
                for key in keys_to_expire:
                    pipe.expire(key, self.cache_ttl)
            
            pipe.execute()
            
            return items
        return {}

    def add_to_set(self, session_id, set_name, value, count=1, ttl=None):
        """
        Dodaje wartość do zbioru.
        
        Używa natywnych struktur danych Redis: zbiorów i hashów.
        """
        # Klucze dla Redis
        set_key = f"set:{session_id}:{set_name}"
        hash_key = f"hash:{session_id}:{set_name}:{value}"
        meta_key = f"meta:{session_id}:{set_name}"
        dirty_key = f"set:{session_id}:{set_name}"
        
        now = datetime.datetime.utcnow()
        now_iso = now.isoformat()
        
        # Określenie TTL
        use_expiry = True
        if ttl is not None:
            if ttl <= 0:
                use_expiry = False
                item_ttl = -1
            else:
                item_ttl = ttl
        else:
            item_ttl = self.cache_ttl
            use_expiry = self.cache_ttl > 0
        
        # Pipeline dla operacji Redis
        pipe = self.redis_client.pipeline()
        
        # Dodaj element do zbioru
        pipe.sadd(set_key, value)
        
        # Przygotuj dane dla hasha elementu
        hash_data = {
            "count": count,
            "added_at": now_iso,
            "last_updated": now_iso
        }
        
        # Dodaj expires_at tylko jeśli używamy wygaśnięcia i TTL > 0
        if use_expiry and item_ttl > 0:
            expires_at = (now + datetime.timedelta(seconds=item_ttl)).isoformat()
            hash_data["expires_at"] = expires_at
        
        # Sprawdź czy element istnieje i zaktualizuj go
        if self.redis_client.exists(hash_key):
            old_data = self.redis_client.hgetall(hash_key)
            if b'count' in old_data:
                old_count = int(old_data[b'count'].decode('utf-8'))
                hash_data["count"] = old_count + count
        
        # Zapisz metadane elementu jako hash
        pipe.hset(hash_key, mapping=hash_data)
        
        # Dodajemy wpis do Redis Stack dla wyszukiwania
        search_key = f"search:{session_id}:{set_name}:{value}"
        search_data = {
            "session_id": session_id,
            "set_name": set_name,
            "value": value
        }
        
        pipe.hset(search_key, mapping=search_data)
        
        # Ustaw TTL dla wszystkich kluczy
        if use_expiry and item_ttl > 0:
            keys_to_expire = [set_key, hash_key, meta_key, search_key]
            for key in keys_to_expire:
                pipe.expire(key, item_ttl)
        
        # Wykonaj wszystkie operacje atomowo
        pipe.execute()
        
        # Oznacz klucz jako "brudny" - wymaga zapisu do MongoDB
        with self.write_lock:
            self.dirty_keys.add(dirty_key)
        
        return True

    def add_many_to_set(self, session_id, set_name, values, count=1, ttl=None):
        """
        Dodaje wiele wartości do zbioru.
        
        Używa natywnych struktur danych Redis z batch operacją.
        """
        if not values:
            return True
        
        # Klucze dla Redis
        set_key = f"set:{session_id}:{set_name}"
        meta_key = f"meta:{session_id}:{set_name}"
        dirty_key = f"set:{session_id}:{set_name}"
        
        now = datetime.datetime.utcnow()
        now_iso = now.isoformat()
        
        # Określenie TTL
        use_expiry = True
        if ttl is not None:
            if ttl <= 0:
                use_expiry = False
                item_ttl = -1
            else:
                item_ttl = ttl
        else:
            item_ttl = self.cache_ttl
            use_expiry = self.cache_ttl > 0
        
        # Pipeline dla operacji Redis
        pipe = self.redis_client.pipeline()
        
        # Dodaj wszystkie elementy do zbioru
        pipe.sadd(set_key, *values)
        
        # Przygotuj dane dla hashów elementów
        for value in values:
            hash_key = f"hash:{session_id}:{set_name}:{value}"
            
            # Przygotuj dane dla hasha elementu
            hash_data = {
                "count": count,
                "added_at": now_iso,
                "last_updated": now_iso
            }
            
            # Dodaj expires_at tylko jeśli używamy wygaśnięcia i TTL > 0
            if use_expiry and item_ttl > 0:
                expires_at = (now + datetime.timedelta(seconds=item_ttl)).isoformat()
                hash_data["expires_at"] = expires_at
            
            # Sprawdź czy element istnieje i zaktualizuj go
            if self.redis_client.exists(hash_key):
                old_data = self.redis_client.hgetall(hash_key)
                if b'count' in old_data:
                    old_count = int(old_data[b'count'].decode('utf-8'))
                    hash_data["count"] = old_count + count
            
            # Zapisz metadane elementu jako hash
            pipe.hset(hash_key, mapping=hash_data)
            
            # Dodajemy wpis do Redis Stack dla wyszukiwania
            search_key = f"search:{session_id}:{set_name}:{value}"
            search_data = {
                "session_id": session_id,
                "set_name": set_name,
                "value": value
            }
            pipe.hset(search_key, mapping=search_data)
            
            # Ustaw TTL dla kluczy
            if use_expiry and item_ttl > 0:
                pipe.expire(hash_key, item_ttl)
                pipe.expire(search_key, item_ttl)
        
        # Ustaw TTL dla głównych kluczy
        if use_expiry and item_ttl > 0:
            pipe.expire(set_key, item_ttl)
            pipe.expire(meta_key, item_ttl)
        
        # Wykonaj wszystkie operacje atomowo
        pipe.execute()
        
        # Oznacz klucz jako "brudny" - wymaga zapisu do MongoDB
        with self.write_lock:
            self.dirty_keys.add(dirty_key)
        
        return True

    def increment_in_set(self, session_id, set_name, value, increment=1):
        """
        Zwiększa licznik dla wartości w zbiorze.
        
        Używa natywnych struktur danych Redis.
        """
        # Klucze dla Redis
        set_key = f"set:{session_id}:{set_name}" 
        hash_key = f"hash:{session_id}:{set_name}:{value}"
        dirty_key = f"set:{session_id}:{set_name}"
        
        now = datetime.datetime.utcnow()
        now_iso = now.isoformat()
        
        # Sprawdź czy element istnieje
        if not self.redis_client.sismember(set_key, value):
            return self.add_to_set(session_id, set_name, value, increment)
        
        # Pipeline dla operacji Redis
        pipe = self.redis_client.pipeline()
        
        # Pobierz obecny licznik
        current_count = 1
        if self.redis_client.exists(hash_key):
            old_data = self.redis_client.hgetall(hash_key)
            if b'count' in old_data:
                current_count = int(old_data[b'count'].decode('utf-8'))
        
        # Zaktualizuj metadane
        pipe.hset(hash_key, mapping={
            "count": current_count + increment,
            "last_updated": now_iso
        })
        
        # Dodaj expires_at tylko jeśli używamy wygaśnięcia i TTL > 0
        if self.cache_ttl > 0:
            expires_at = (now + datetime.timedelta(seconds=self.cache_ttl)).isoformat()
            pipe.hset(hash_key, "expires_at", expires_at)
            
            # Odśwież TTL
            pipe.expire(set_key, self.cache_ttl)
            pipe.expire(hash_key, self.cache_ttl)
        
        # Wykonaj wszystkie operacje atomowo
        pipe.execute()
        
        # Oznacz klucz jako "brudny" - wymaga zapisu do MongoDB
        with self.write_lock:
            self.dirty_keys.add(dirty_key)
        
        return True

    def update_in_set(self, session_id, set_name, old_value, new_value, preserve_count=True):
        """
        Aktualizuje wartość w zbiorze.
        
        Używa natywnych struktur danych Redis.
        """
        if old_value == new_value:
            return True
                
        # Klucze dla Redis
        set_key = f"set:{session_id}:{set_name}"
        old_hash_key = f"hash:{session_id}:{set_name}:{old_value}"
        new_hash_key = f"hash:{session_id}:{set_name}:{new_value}"
        meta_key = f"meta:{session_id}:{set_name}"
        dirty_key = f"set:{session_id}:{set_name}"
        
        now = datetime.datetime.utcnow()
        now_iso = now.isoformat()
        
        # Sprawdź czy zbiór istnieje
        if not self.redis_client.exists(set_key):
            self.logger.warning(f"Set {set_name} for session {session_id} does not exist")
            return False
        
        # Sprawdź czy stara wartość istnieje
        if not self.redis_client.sismember(set_key, old_value):
            self.logger.warning(f"Value '{old_value}' not found in set '{set_name}'")
            return False
        
        # Pobierz metadane dla starej wartości
        old_data = {}
        if self.redis_client.exists(old_hash_key):
            old_hash = self.redis_client.hgetall(old_hash_key)
            for key, value in old_hash.items():
                old_data[key.decode('utf-8')] = value.decode('utf-8')
        
        # Pobierz pozostały TTL dla starego hasza
        remaining_ttl = self.redis_client.ttl(old_hash_key)
        
        # Sprawdź czy nowa wartość już istnieje w zbiorze
        new_value_exists = self.redis_client.sismember(set_key, new_value)
        
        # Pipeline dla operacji Redis
        pipe = self.redis_client.pipeline()
        
        # Usuń starą wartość
        pipe.srem(set_key, old_value)
        pipe.delete(old_hash_key)
        
        # Dodaj nową wartość
        pipe.sadd(set_key, new_value)
        
        # Przygotuj dane dla nowego hasha
        hash_data = {
            # Zachowujemy oryginalny licznik bez względu na to, czy nowa wartość istnieje
            "count": int(old_data.get("count", 1)) if preserve_count else 1,
            "added_at": old_data.get("added_at", now_iso),
            "last_updated": now_iso
        }
        
        # Jeśli stara wartość miała ustawioną datę wygaśnięcia, przenieśmy ją
        if "expires_at" in old_data:
            hash_data["expires_at"] = old_data["expires_at"]
        elif self.cache_ttl > 0:
            expires_at = (now + datetime.timedelta(seconds=self.cache_ttl)).isoformat()
            hash_data["expires_at"] = expires_at
        
        # Jeśli nowa wartość istnieje, usuń jej hash przed ustawieniem nowego
        if new_value_exists:
            pipe.delete(new_hash_key)
        
        # Zapisz metadane dla nowej wartości
        pipe.hset(new_hash_key, mapping=hash_data)
        
        # Aktualizuj indeks wyszukiwania
        old_search_key = f"search:{session_id}:{set_name}:{old_value}"
        new_search_key = f"search:{session_id}:{set_name}:{new_value}"
        
        # Usuń stary klucz wyszukiwania
        pipe.delete(old_search_key)
        
        # Dodaj nowy klucz wyszukiwania
        search_data = {
            "session_id": session_id,
            "set_name": set_name,
            "value": new_value
        }
        pipe.hset(new_search_key, mapping=search_data)
        
        # Odśwież TTL dla kluczy z zachowaniem pozostałego czasu
        keys_to_expire = [set_key, new_hash_key, meta_key, new_search_key]
        for key in keys_to_expire:
            if remaining_ttl > 0:
                # Użyj pozostałego czasu TTL ze starego klucza
                pipe.expire(key, remaining_ttl)
            elif self.cache_ttl > 0:
                # Jeśli nie ma TTL lub wygasł, ustaw domyślny TTL
                pipe.expire(key, self.cache_ttl)
        
        # Wykonaj wszystkie operacje atomowo
        pipe.execute()
        
        # Dodaj log diagnostyczny
        self.logger.info(f"Updated value in set {set_name}: '{old_value}' -> '{new_value}', count: {hash_data.get('count')}, remaining TTL: {remaining_ttl}")
        
        # Oznacz klucz jako "brudny" - wymaga zapisu do MongoDB
        with self.write_lock:
            self.dirty_keys.add(dirty_key)
        
        return True

    def delete_from_set(self, session_id, set_name, value, decrement=1):
        """
        Usuwa wartość ze zbioru lub zmniejsza jej licznik.
        
        Używa natywnych struktur danych Redis.
        """
        # Klucze dla Redis
        set_key = f"set:{session_id}:{set_name}"
        hash_key = f"hash:{session_id}:{set_name}:{value}"
        search_key = f"search:{session_id}:{set_name}:{value}"
        dirty_key = f"set:{session_id}:{set_name}"
        
        # Sprawdź czy wartość istnieje
        if not self.redis_client.sismember(set_key, value):
            return False
        
        now = datetime.datetime.utcnow()
        now_iso = now.isoformat()
        
        # Pobierz obecny licznik
        current_count = 1
        if self.redis_client.exists(hash_key):
            old_data = self.redis_client.hgetall(hash_key)
            if b'count' in old_data:
                current_count = int(old_data[b'count'].decode('utf-8'))
        
        # Pipeline dla operacji Redis
        pipe = self.redis_client.pipeline()
        
        # Jeśli licznik > decrement, zmniejszamy go
        if current_count > decrement:
            # Zaktualizuj metadane
            pipe.hset(hash_key, mapping={
                "count": current_count - decrement,
                "last_updated": now_iso
            })
            
            # Odśwież TTL jeśli potrzeba
            if self.cache_ttl > 0:
                pipe.expire(set_key, self.cache_ttl)
                pipe.expire(hash_key, self.cache_ttl)
        else:
            # W przeciwnym razie usuwamy element całkowicie
            pipe.srem(set_key, value)
            pipe.delete(hash_key)
            pipe.delete(search_key)
        
        # Wykonaj wszystkie operacje atomowo
        pipe.execute()
        
        # Oznacz klucz jako "brudny" - wymaga zapisu do MongoDB
        with self.write_lock:
            self.dirty_keys.add(dirty_key)
        
        return True

    def delete_many_from_set(self, session_id, set_name, values, count=1):
        """
        Usuwa wiele wartości ze zbioru lub zmniejsza ich liczniki.
        
        Używa natywnych struktur danych Redis z batch operacją.
        
        Args:
            session_id (str): ID sesji
            set_name (str): Nazwa zbioru
            values (list): Lista wartości do usunięcia
            count (int): O ile zmniejszyć licznik każdej wartości (domyślnie 1)
        """
        if not values:
            return True
        
        # Klucze dla Redis
        set_key = f"set:{session_id}:{set_name}"
        meta_key = f"meta:{session_id}:{set_name}"
        dirty_key = f"set:{session_id}:{set_name}"
        
        now = datetime.datetime.utcnow()
        now_iso = now.isoformat()
        
        # Sprawdź czy klucz zbioru istnieje
        if not self.redis_client.exists(set_key):
            return False
        
        # Pipeline dla operacji Redis
        pipe = self.redis_client.pipeline()
        
        # Sprawdź czy mamy typ kolekcji (potrzebne do usuwania kluczy wyszukiwania)
        collection_type = None
        if self.redis_client.exists(meta_key):
            meta_data = self.redis_client.hgetall(meta_key)
            if b'collection_type' in meta_data:
                collection_type = meta_data[b'collection_type'].decode('utf-8')
        
        # Przetwórz każdą wartość
        for value in values:
            # Sprawdź czy wartość istnieje
            if not self.redis_client.sismember(set_key, value):
                continue
                
            hash_key = f"hash:{session_id}:{set_name}:{value}"
            search_key = f"search:{session_id}:{set_name}:{value}"
            
            # Pobierz obecny licznik
            current_count = 1
            if self.redis_client.exists(hash_key):
                old_data = self.redis_client.hgetall(hash_key)
                if b'count' in old_data:
                    current_count = int(old_data[b'count'].decode('utf-8'))
            
            # Jeśli licznik > count, zmniejszamy go
            if current_count > count:
                # Zaktualizuj metadane
                pipe.hset(hash_key, mapping={
                    "count": current_count - count,
                    "last_updated": now_iso
                })
                
                # Odśwież TTL jeśli potrzeba
                if self.cache_ttl > 0:
                    pipe.expire(hash_key, self.cache_ttl)
            else:
                # W przeciwnym razie usuwamy element całkowicie
                pipe.srem(set_key, value)
                pipe.delete(hash_key)
                
                # Usuń klucz wyszukiwania z Redis Stack
                pipe.delete(search_key)
        
        # Odśwież TTL dla głównego klucza zbioru
        if self.cache_ttl > 0:
            pipe.expire(set_key, self.cache_ttl)
            pipe.expire(meta_key, self.cache_ttl)
        
        # Wykonaj wszystkie operacje atomowo
        pipe.execute()
        
        # Oznacz klucz jako "brudny" - wymaga zapisu do MongoDB
        with self.write_lock:
            self.dirty_keys.add(dirty_key)
        
        return True
