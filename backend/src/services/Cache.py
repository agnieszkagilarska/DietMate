import datetime
import json
import logging
import threading
import time
import queue

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
        
        # Utworzenie indeksów MongoDB (bez zmian)
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
            self.mongo_collection.create_index([("session_id", 1), ("set_name", 1)], unique=True)
        except Exception as e:
            self.logger.info(f"Index 'session_id_1_set_name_1' might already exist: {e}")
            
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
                {"name": "collection_type", "type": "TEXT", "sortable": True},
                {"name": "value", "type": "TEXT", "sortable": True}
            ], definition=None)
        except Exception as e:
            self.logger.info(f"Indeks w Redis mógł już zostać utworzony: {e}")
            
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
        Zapisuje wszystkie oczekujące dane z Redis do MongoDB.
        """
        with self.write_lock:
            dirty_keys = list(self.dirty_keys)
            self.dirty_keys.clear()
            
        if not dirty_keys:
            return
        
        self.logger.info(f"Zapisywanie {len(dirty_keys)} kluczy do MongoDB")
        
        for key in dirty_keys:
            try:
                # Rozpoznaj typ klucza i wykonaj odpowiednią operację zapisu
                if key.startswith("value:"):
                    _, session_id, cache_key = key.split(":", 2)
                    self._flush_simple_value(session_id, cache_key)
                elif key.startswith("set:"):
                    _, session_id, set_name = key.split(":", 2)
                    self._flush_set_value(session_id, set_name)
            except Exception as e:
                self.logger.error(f"Błąd podczas zapisywania klucza {key} do MongoDB: {e}")
                # Dodaj z powrotem do dirty_keys, żeby spróbować później
                with self.write_lock:
                    self.dirty_keys.add(key)
    
    def _flush_simple_value(self, session_id, key):
        """
        Zapisuje prostą wartość z Redis do MongoDB.
        """
        redis_key = f"{session_id}:{key}"
        cached_value = self.redis_client.get(redis_key)
        
        if cached_value:
            now = datetime.datetime.utcnow()
            update_data = {
                "$set": {
                    "session_id": session_id,
                    "key": key,
                    "value": cached_value.decode('utf-8'),
                    "updated_at": now
                }
            }
            
            # Dodaj expires_at tylko jeśli cache_ttl > 0
            if self.cache_ttl > 0:
                ttl = self.redis_client.ttl(redis_key)
                if ttl > 0:
                    expires_at = now + datetime.timedelta(seconds=ttl)
                    update_data["$set"]["expires_at"] = expires_at
            
            self.mongo_collection.update_one(
                {"session_id": session_id, "key": key},
                update_data,
                upsert=True
            )
    
    def _flush_set_value(self, session_id, set_name):
        """
        Zapisuje zbiór z Redis do MongoDB.
        """
        redis_key = f"set:{session_id}:{set_name}"
        cached = self.redis_client.get(redis_key)
        
        if cached:
            try:
                items = json.loads(cached.decode('utf-8'))
                now = datetime.datetime.utcnow()
                
                # Pobierz dodatkowe dane typu kolekcji, jeśli dostępne
                collection_key = f"collection_type:{session_id}:{set_name}"
                collection_type = self.redis_client.get(collection_key)
                if collection_type:
                    collection_type = collection_type.decode('utf-8')
                
                update_data = {
                    "$set": {
                        "session_id": session_id,
                        "set_name": set_name,
                        "items": items,
                        "updated_at": now
                    }
                }
                
                if collection_type:
                    update_data["$set"]["collection_type"] = collection_type
                
                # Dodaj expires_at tylko jeśli cache_ttl > 0
                if self.cache_ttl > 0:
                    ttl = self.redis_client.ttl(redis_key)
                    if ttl > 0:
                        expires_at = now + datetime.timedelta(seconds=ttl)
                        update_data["$set"]["expires_at"] = expires_at
                
                self.mongo_collection.update_one(
                    {"session_id": session_id, "set_name": set_name},
                    update_data,
                    upsert=True
                )
            except json.JSONDecodeError as e:
                self.logger.error(f"Błąd dekodowania JSON dla klucza {redis_key}: {e}")

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

    def get_set(self, session_id, set_name, collection_type=None):
        """
        Pobiera zawartość zbioru z cache (Redis) lub źródła danych (MongoDB).
        """
        redis_key = f"set:{session_id}:{set_name}"
        cached = self.redis_client.get(redis_key)
        if cached:
            self.logger.info(f"Cache hit for set {redis_key}")
            return json.loads(cached.decode('utf-8'))
        
        # Cache miss - sprawdzamy w MongoDB
        self.logger.info(f"Cache miss for set {redis_key}, fetching from MongoDB")
        query = {"session_id": session_id, "set_name": set_name}
        if collection_type:
            query["collection_type"] = collection_type
            
        doc = self.mongo_collection.find_one(query)
        if doc:
            items = doc.get("items", {})
            
            # Zapisz w Redis
            if self.cache_ttl > 0:
                self.redis_client.setex(redis_key, self.cache_ttl, json.dumps(items, cls=DateTimeEncoder))
            else:
                self.redis_client.set(redis_key, json.dumps(items, cls=DateTimeEncoder))
            
            # Zapisz typ kolekcji dla późniejszego flushu
            if collection_type or doc.get("collection_type"):
                coll_type = collection_type or doc.get("collection_type")
                self.redis_client.set(f"collection_type:{session_id}:{set_name}", coll_type)
            
            return items
        return {}

    def add_to_set(self, session_id, set_name, value, count=1, ttl=None, collection_type=None):
        """
        Dodaje wartość do zbioru.
        
        Implementacja wzorca write-back - najpierw pobieramy aktualny stan z Redis, 
        modyfikujemy go i zapisujemy z powrotem do Redis. Zapis do MongoDB jest opóźniony.
        """
        now = datetime.datetime.utcnow()
        redis_key = f"set:{session_id}:{set_name}"
        dirty_key = f"set:{session_id}:{set_name}"
        
        # Pobierz aktualny stan zbioru z Redis
        cached = self.redis_client.get(redis_key)
        items = json.loads(cached.decode('utf-8')) if cached else {}
        
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
        
        # Aktualizuj wartość w zbiorze
        if value not in items:
            items[value] = {
                "count": count,
                "added_at": now.isoformat(),
                "last_updated": now.isoformat()
            }
        else:
            items[value]["count"] = items[value].get("count", 0) + count
            items[value]["last_updated"] = now.isoformat()
        
        # Dodaj expires_at tylko jeśli używamy wygaśnięcia i TTL > 0
        if use_expiry and item_ttl > 0:
            expires_at = (now + datetime.timedelta(seconds=item_ttl)).isoformat()
            items[value]["expires_at"] = expires_at
        elif not use_expiry and "expires_at" in items[value]:
            del items[value]["expires_at"]
        
        # Zapisz zbiór z powrotem do Redis
        if item_ttl > 0 and use_expiry:
            self.redis_client.setex(redis_key, item_ttl, json.dumps(items, cls=DateTimeEncoder))
        else:
            self.redis_client.set(redis_key, json.dumps(items, cls=DateTimeEncoder))
        
        # Zapisz typ kolekcji dla późniejszego flushu
        if collection_type:
            self.redis_client.set(f"collection_type:{session_id}:{set_name}", collection_type)
        
        # Dodajemy wpis do Redis Stack dla wyszukiwania
        if collection_type:
            search_key = f"search:{session_id}:{set_name}:{value}"
            search_data = {
                "session_id": session_id,
                "collection_type": collection_type,
                "set_name": set_name,
                "value": value
            }
            self.redis_client.hset(search_key, mapping=search_data)
            if use_expiry and item_ttl > 0:
                self.redis_client.expire(search_key, item_ttl)
        
        # Oznacz klucz jako "brudny" - wymaga zapisu do MongoDB
        with self.write_lock:
            self.dirty_keys.add(dirty_key)
        
        return True

    def add_many_to_set(self, session_id, set_name, values, count=1, ttl=None, collection_type=None):
        """
        Dodaje wiele wartości do zbioru.
        
        Implementacja wzorca write-back - zapisujemy dane tylko w Redis, 
        a zapis do MongoDB jest opóźniony.
        """
        if not values:
            return True
        
        now = datetime.datetime.utcnow()
        redis_key = f"set:{session_id}:{set_name}"
        dirty_key = f"set:{session_id}:{set_name}"
        
        # Pobierz aktualny stan zbioru z Redis
        cached = self.redis_client.get(redis_key)
        items = json.loads(cached.decode('utf-8')) if cached else {}
        
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
        
        # Aktualizuj wartości w zbiorze
        for value in values:
            if value not in items:
                items[value] = {
                    "count": count,
                    "added_at": now.isoformat(),
                    "last_updated": now.isoformat()
                }
            else:
                items[value]["count"] = items[value].get("count", 0) + count
                items[value]["last_updated"] = now.isoformat()
            
            # Dodaj expires_at tylko jeśli używamy wygaśnięcia i TTL > 0
            if use_expiry and item_ttl > 0:
                expires_at = (now + datetime.timedelta(seconds=item_ttl)).isoformat()
                items[value]["expires_at"] = expires_at
            elif not use_expiry and "expires_at" in items[value]:
                del items[value]["expires_at"]
            
            # Dodajemy wpis do Redis Stack dla wyszukiwania
            if collection_type:
                search_key = f"search:{session_id}:{set_name}:{value}"
                search_data = {
                    "session_id": session_id,
                    "collection_type": collection_type,
                    "set_name": set_name,
                    "value": value
                }
                self.redis_client.hset(search_key, mapping=search_data)
                if use_expiry and item_ttl > 0:
                    self.redis_client.expire(search_key, item_ttl)
        
        # Zapisz zbiór z powrotem do Redis
        if item_ttl > 0 and use_expiry:
            self.redis_client.setex(redis_key, item_ttl, json.dumps(items, cls=DateTimeEncoder))
        else:
            self.redis_client.set(redis_key, json.dumps(items, cls=DateTimeEncoder))
        
        # Zapisz typ kolekcji dla późniejszego flushu
        if collection_type:
            self.redis_client.set(f"collection_type:{session_id}:{set_name}", collection_type)
        
        # Oznacz klucz jako "brudny" - wymaga zapisu do MongoDB
        with self.write_lock:
            self.dirty_keys.add(dirty_key)
        
        return True

    def increment_in_set(self, session_id, set_name, value, increment=1):
        """
        Zwiększa licznik dla wartości w zbiorze.
        
        Implementacja wzorca write-back - modyfikuje dane w Redis, 
        a zapis do MongoDB jest opóźniony.
        """
        now = datetime.datetime.utcnow()
        redis_key = f"set:{session_id}:{set_name}"
        dirty_key = f"set:{session_id}:{set_name}"
        
        # Pobierz aktualny stan zbioru z Redis
        cached = self.redis_client.get(redis_key)
        items = json.loads(cached.decode('utf-8')) if cached else {}
        
        # Jeśli wartość istnieje, zwiększ licznik
        if value in items:
            items[value]["count"] = items[value].get("count", 0) + increment
            items[value]["last_updated"] = now.isoformat()
            
            # Obsługa TTL
            if self.cache_ttl > 0:
                expires_at = (now + datetime.timedelta(seconds=self.cache_ttl)).isoformat()
                items[value]["expires_at"] = expires_at
        else:
            # Jeśli wartość nie istnieje, dodaj ją
            return self.add_to_set(session_id, set_name, value, increment)
        
        # Zapisz zbiór z powrotem do Redis
        if self.cache_ttl > 0:
            self.redis_client.setex(redis_key, self.cache_ttl, json.dumps(items, cls=DateTimeEncoder))
        else:
            self.redis_client.set(redis_key, json.dumps(items, cls=DateTimeEncoder))
        
        # Oznacz klucz jako "brudny" - wymaga zapisu do MongoDB
        with self.write_lock:
            self.dirty_keys.add(dirty_key)
        
        return True

    def update_in_set(self, session_id, set_name, old_value, new_value, preserve_count=True):
        """
        Aktualizuje wartość w zbiorze.
        
        Implementacja wzorca write-back - modyfikuje dane w Redis, 
        a zapis do MongoDB jest opóźniony.
        """
        now = datetime.datetime.utcnow()
        redis_key = f"set:{session_id}:{set_name}"
        dirty_key = f"set:{session_id}:{set_name}"
        
        # Pobierz aktualny stan zbioru z Redis
        cached = self.redis_client.get(redis_key)
        if not cached:
            # Jeśli nie ma w Redis, spróbuj pobrać z MongoDB
            set_data = self.get_set(session_id, set_name)
            if not set_data or old_value not in set_data:
                return False
            items = set_data
        else:
            items = json.loads(cached.decode('utf-8'))
            if old_value not in items:
                return False
        
        # Pobierz dane o starej wartości
        old_item_data = items[old_value].copy()
        count = old_item_data.get("count", 1) if preserve_count else 1
        
        # Usuń starą wartość i dodaj nową
        del items[old_value]
        items[new_value] = {
            "count": count,
            "added_at": old_item_data.get("added_at", now.isoformat()),
            "last_updated": now.isoformat()
        }
        
        # Obsługa TTL
        if self.cache_ttl > 0 or "expires_at" in old_item_data:
            if "expires_at" in old_item_data:
                items[new_value]["expires_at"] = old_item_data["expires_at"]
            else:
                expires_at = (now + datetime.timedelta(seconds=self.cache_ttl)).isoformat()
                items[new_value]["expires_at"] = expires_at
        
        # Zapisz zbiór z powrotem do Redis
        if self.cache_ttl > 0:
            self.redis_client.setex(redis_key, self.cache_ttl, json.dumps(items, cls=DateTimeEncoder))
        else:
            self.redis_client.set(redis_key, json.dumps(items, cls=DateTimeEncoder))
        
        # Oznacz klucz jako "brudny" - wymaga zapisu do MongoDB
        with self.write_lock:
            self.dirty_keys.add(dirty_key)
        
        # Aktualizuj klucze wyszukiwania w Redis Stack
        collection_type_key = f"collection_type:{session_id}:{set_name}"
        collection_type = self.redis_client.get(collection_type_key)
        if collection_type:
            collection_type = collection_type.decode('utf-8')
            
            # Usuń stary klucz wyszukiwania
            old_search_key = f"search:{session_id}:{set_name}:{old_value}"
            self.redis_client.delete(old_search_key)
            
            # Dodaj nowy klucz wyszukiwania
            new_search_key = f"search:{session_id}:{set_name}:{new_value}"
            search_data = {
                "session_id": session_id,
                "collection_type": collection_type,
                "set_name": set_name,
                "value": new_value
            }
            self.redis_client.hset(new_search_key, mapping=search_data)
            
            # Ustaw TTL jeśli potrzeba
            if self.cache_ttl > 0:
                self.redis_client.expire(new_search_key, self.cache_ttl)
        
        return True

    def delete_from_set(self, session_id, set_name, value, decrement=1):
        """
        Usuwa wartość ze zbioru lub zmniejsza jej licznik.
        
        Implementacja wzorca write-back - modyfikuje dane w Redis, 
        a zapis do MongoDB jest opóźniony.
        """
        redis_key = f"set:{session_id}:{set_name}"
        dirty_key = f"set:{session_id}:{set_name}"
        
        # Pobierz aktualny stan zbioru z Redis
        cached = self.redis_client.get(redis_key)
        if not cached:
            # Jeśli nie ma w Redis, spróbuj pobrać z MongoDB
            items = self.get_set(session_id, set_name)
            if not items or value not in items:
                return False
        else:
            items = json.loads(cached.decode('utf-8'))
            if value not in items:
                return False
        
        now = datetime.datetime.utcnow()
        current_count = items[value].get("count", 1)
        
        # Jeśli licznik > decrement, zmniejszamy go
        if current_count > decrement:
            items[value]["count"] = current_count - decrement
            items[value]["last_updated"] = now.isoformat()
        else:
            # W przeciwnym razie usuwamy element całkowicie
            del items[value]
            
            # Usuń klucz wyszukiwania z Redis Stack
            collection_type_key = f"collection_type:{session_id}:{set_name}"
            collection_type = self.redis_client.get(collection_type_key)
            if collection_type:
                search_key = f"search:{session_id}:{set_name}:{value}"
                self.redis_client.delete(search_key)
        
        # Zapisz zbiór z powrotem do Redis
        if self.cache_ttl > 0:
            self.redis_client.setex(redis_key, self.cache_ttl, json.dumps(items, cls=DateTimeEncoder))
        else:
            self.redis_client.set(redis_key, json.dumps(items, cls=DateTimeEncoder))
        
        # Oznacz klucz jako "brudny" - wymaga zapisu do MongoDB
        with self.write_lock:
            self.dirty_keys.add(dirty_key)
        
        return True

    def delete_many_from_set(self, session_id, set_name, values, decrement=1):
        """
        Usuwa wiele wartości ze zbioru lub zmniejsza ich liczniki.
        
        Implementacja wzorca write-back - modyfikuje dane w Redis, 
        a zapis do MongoDB jest opóźniony.
        """
        if not values:
            return True
        
        redis_key = f"set:{session_id}:{set_name}"
        dirty_key = f"set:{session_id}:{set_name}"
        
        # Pobierz aktualny stan zbioru z Redis
        cached = self.redis_client.get(redis_key)
        if not cached:
            # Jeśli nie ma w Redis, spróbuj pobrać z MongoDB
            items = self.get_set(session_id, set_name)
            if not items:
                return False
        else:
            items = json.loads(cached.decode('utf-8'))
        
        now = datetime.datetime.utcnow()
        collection_type_key = f"collection_type:{session_id}:{set_name}"
        collection_type = self.redis_client.get(collection_type_key)
        if collection_type:
            collection_type = collection_type.decode('utf-8')
        
        # Przetwórz każdą wartość
        for value in values:
            if value in items:
                current_count = items[value].get("count", 1)
                
                # Jeśli licznik > decrement, zmniejszamy go
                if current_count > decrement:
                    items[value]["count"] = current_count - decrement
                    items[value]["last_updated"] = now.isoformat()
                else:
                    # W przeciwnym razie usuwamy element całkowicie
                    del items[value]
                    
                    # Usuń klucz wyszukiwania z Redis Stack
                    if collection_type:
                        search_key = f"search:{session_id}:{set_name}:{value}"
                        self.redis_client.delete(search_key)
        
        # Zapisz zbiór z powrotem do Redis
        if self.cache_ttl > 0:
            self.redis_client.setex(redis_key, self.cache_ttl, json.dumps(items, cls=DateTimeEncoder))
        else:
            self.redis_client.set(redis_key, json.dumps(items, cls=DateTimeEncoder))
        
        # Oznacz klucz jako "brudny" - wymaga zapisu do MongoDB
        with self.write_lock:
            self.dirty_keys.add(dirty_key)
        
        return True

    def search_keys(self, session_id=None, collection_type=None, pattern=None, limit=100, offset=0):
        """
        Wyszukuje klucze na podstawie kryteriów.
        
        W przypadku wzorca write-back, najpierw warto zrzucić wszystkie dane do MongoDB,
        aby zapewnić spójność wyników wyszukiwania.
        """
        # Opcjonalnie można wykonać flush przed wyszukiwaniem dla zapewnienia spójności
        # self.flush_all()
        
        query_parts = []
        
        if session_id:
            query_parts.append(f"@session_id:{session_id}")
            
        if collection_type:
            query_parts.append(f"@collection_type:{collection_type}")
            
        if pattern:
            query_parts.append(f"@value:{pattern}*")
            
        query = " ".join(query_parts) if query_parts else "*"
        
        try:
            # Używamy Redis Stack FT.SEARCH
            results = self.redis_client.ft().search(
                query, 
                limit=limit,
                offset=offset
            )
            
            items = []
            for doc in results.docs:
                items.append({
                    "session_id": doc.session_id,
                    "collection_type": doc.collection_type,
                    "set_name": doc.set_name,
                    "value": doc.value
                })
                
            return {
                "total": results.total,
                "items": items
            }
        except Exception as e:
            self.logger.error(f"Błąd wyszukiwania w Redis Stack: {e}")
            
            # Wykonujemy flush, aby upewnić się, że MongoDB ma aktualne dane
            self.flush_all()
            
            # Fallback do MongoDB
            query = {}
            if session_id:
                query["session_id"] = session_id
            if collection_type:
                query["collection_type"] = collection_type
                
            cursor = self.mongo_collection.find(query).skip(offset).limit(limit)
            items = []
            
            for doc in cursor:
                if "items" in doc:
                    for value, data in doc["items"].items():
                        if not pattern or pattern in value:
                            items.append({
                                "session_id": doc["session_id"],
                                "collection_type": doc.get("collection_type"),
                                "set_name": doc["set_name"],
                                "value": value
                            })
            
            return {
                "total": len(items),
                "items": items[:limit]
            }