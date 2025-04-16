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

class DateTimeEncoder(json.JSONEncoder):
    """Klasa do serializacji obiektów datetime do JSON."""
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        return super().default(obj)

class CacheService:
    def __init__(self, redis_client, mongo_collection, cache_ttl=0):
        self.redis_client = redis_client
        self.mongo_collection = mongo_collection
        self.cache_ttl = cache_ttl
        self.logger = setup_logger(__name__)
        
        # Create MongoDB indexes with try-except blocks to handle existing indexes
        try:
            self.mongo_collection.create_index("expires_at", expireAfterSeconds=0)
        except Exception as e:
            self.logger.info(f"Index 'expires_at' might already exist: {e}")
            
        try:
            self.mongo_collection.create_index(
                [("session_id", 1), ("key", 1)], 
                unique=True,
                partialFilterExpression={"key": {"$type": "string"}},  # Tylko dla niepustych kluczy
                name="session_id_key_partial_filter"  # Custom name to avoid conflicts
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

    def get_value(self, session_id, key):
        """
        Pobiera wartość dla klucza z cache (Redis) lub źródła danych (MongoDB).
        
        Implementacja wzorca cache-aside dla prostych wartości.
        """
        cache_key = f"{session_id}:{key}"
        cached_value = self.redis_client.get(cache_key)
        if cached_value:
            self.logger.info(f"Cache hit for {cache_key}")
            return cached_value.decode('utf-8')
        
        self.logger.info(f"Cache miss for {cache_key}, fetching from MongoDB")
        result = self.mongo_collection.find_one({"session_id": session_id, "key": key})
        if result:
            value = result.get("value")
            if self.cache_ttl > 0:
                self.redis_client.setex(cache_key, self.cache_ttl, value)
            else:
                self.redis_client.set(cache_key, value)  # Bez wygasania
            return value
        return None

    def set_value(self, session_id, key, value):
        """
        Zapisuje wartość zarówno w MongoDB jak i w Redis.
        
        Implementacja wzorca cache-aside dla prostych wartości.
        """
        now = datetime.datetime.utcnow()
        update_data = {
            "$set": {
                "value": value, 
                "updated_at": now
            }
        }
        
        # Dodaj expires_at tylko jeśli cache_ttl > 0
        if self.cache_ttl > 0:
            expires_at = now + datetime.timedelta(seconds=self.cache_ttl)
            update_data["$set"]["expires_at"] = expires_at
        
        self.mongo_collection.update_one(
            {"session_id": session_id, "key": key},
            update_data,
            upsert=True
        )
        
        cache_key = f"{session_id}:{key}"
        if self.cache_ttl > 0:
            self.redis_client.setex(cache_key, self.cache_ttl, value)
        else:
            self.redis_client.set(cache_key, value)  # Bez wygasania
        return True

    def get_set(self, session_id, set_name, collection_type=None):
        """
        Pobiera zawartość zbioru z cache (Redis) lub źródła danych (MongoDB).
        
        Implementacja wzorca cache-aside dla zbiorów.
        """
        redis_key = f"set:{session_id}:{set_name}"
        cached = self.redis_client.get(redis_key)
        if cached:
            self.logger.info(f"Cache hit for set {redis_key}")
            return json.loads(cached.decode('utf-8'))
        
        self.logger.info(f"Cache miss for set {redis_key}, fetching from MongoDB")
        query = {"session_id": session_id, "set_name": set_name}
        if collection_type:
            query["collection_type"] = collection_type
            
        doc = self.mongo_collection.find_one(query)
        if doc:
            items = doc.get("items", {})
            if self.cache_ttl > 0:
                self.redis_client.setex(redis_key, self.cache_ttl, json.dumps(items, cls=DateTimeEncoder))
            else:
                self.redis_client.set(redis_key, json.dumps(items, cls=DateTimeEncoder))  # Bez wygasania
            return items
        return {}

    def _update_redis_set_cache(self, session_id, set_name):
        """
        Wewnętrzna metoda pomocnicza do aktualizacji cache w Redis dla zbioru.
        
        Pobiera aktualne dane z MongoDB i zapisuje je w Redis.
        """
        redis_key = f"set:{session_id}:{set_name}"
        doc = self.mongo_collection.find_one({"session_id": session_id, "set_name": set_name})
        if doc and "items" in doc:
            items = doc.get("items", {})
            # Sprawdzamy czy jakikolwiek element ma datę wygaśnięcia
            has_expiry = any("expires_at" in item_data for item_data in items.values())
            now = datetime.datetime.utcnow()
            
            if has_expiry:
                # Używamy TTL dla Redis jeśli jest chociaż jeden element z wygasaniem
                max_ttl = self.cache_ttl if self.cache_ttl > 0 else 0
                for item_data in items.values():
                    if "expires_at" in item_data:
                        expires_at = item_data["expires_at"]
                        item_ttl = max(0, int((expires_at - now).total_seconds()))
                        if max_ttl == 0:
                            max_ttl = item_ttl
                        else:
                            max_ttl = max(item_ttl, max_ttl)
                
                # Tylko jeśli znaleźliśmy niezerowy TTL, używamy setex
                if max_ttl > 0:
                    self.redis_client.setex(redis_key, max_ttl, json.dumps(items, cls=DateTimeEncoder))
                else:
                    self.redis_client.set(redis_key, json.dumps(items, cls=DateTimeEncoder))
            else:
                # Brak elementów z wygasaniem, nie używamy TTL
                self.redis_client.set(redis_key, json.dumps(items, cls=DateTimeEncoder))
            return items
        else:
            self.redis_client.delete(redis_key)
            return {}

    def add_to_set(self, session_id, set_name, value, count=1, ttl=None, collection_type=None):
        """
        Dodaje wartość do zbioru z opcjonalnym licznikiem i TTL.
        
        Implementacja wzorca cache-aside - aktualizuje zarówno MongoDB jak i Redis.
        
        Args:
            session_id: ID sesji
            set_name: Nazwa zbioru
            value: Wartość do dodania
            count: Liczba wystąpień (domyślnie 1)
            ttl: Opcjonalny TTL (w sekundach) dla tej wartości:
                - None: użyj domyślnego TTL z cache_ttl
                - 0 lub ujemny: klucz trwały (bez wygaśnięcia)
                - Dodatni: użyj podanej wartości jako TTL
            collection_type: Typ kolekcji (np. 'liked', 'bucket')
        """
        now = datetime.datetime.utcnow()
        
        # Określenie TTL:
        # - None: użyj domyślnej wartości
        # - 0 lub ujemna: bez wygaśnięcia
        # - wartość dodatnia: użyj jako TTL
        use_expiry = True
        if ttl is not None:
            # Gdy ttl jest jawnie określone
            if ttl <= 0:
                # TTL <= 0 oznacza "bez wygaśnięcia"
                use_expiry = False
                item_ttl = -1
            else:
                # Dodatni TTL
                item_ttl = ttl
        else:
            # Gdy ttl jest None, użyj domyślnej wartości
            item_ttl = self.cache_ttl
            # Jeśli domyślny TTL <= 0, nie używaj wygaśnięcia
            use_expiry = self.cache_ttl > 0
        
        update_data = {
            "$set": {
                "updated_at": now,
                f"items.{value}.last_updated": now,
            }
        }
        
        # Dodaj expires_at tylko jeśli używamy wygaśnięcia i TTL > 0
        if use_expiry and item_ttl > 0:
            expires_at = now + datetime.timedelta(seconds=item_ttl)
            update_data["$set"][f"items.{value}.expires_at"] = expires_at
        elif not use_expiry:
            # Jawnie ustawiamy brak wygaśnięcia - usuwamy pole expires_at jeśli istnieje
            update_data["$unset"] = {f"items.{value}.expires_at": ""}
        
        if collection_type:
            update_data["$set"]["collection_type"] = collection_type
        update_data["$inc"] = {f"items.{value}.count": count}
        update_data["$setOnInsert"] = {f"items.{value}.added_at": now}
        
        # Aktualizujemy MongoDB
        self.mongo_collection.update_one(
            {"session_id": session_id, "set_name": set_name},
            update_data,
            upsert=True
        )
        
        # Aktualizujemy Redis zamiast usuwać klucz
        self._update_redis_set_cache(session_id, set_name)
        
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
                
        return True

    def add_many_to_set(self, session_id, set_name, values, count=1, ttl=None, collection_type=None):
        """
        Dodaje wiele wartości do zbioru.
        
        Zoptymalizowana implementacja wzorca cache-aside - aktualizuje Redis tylko raz na końcu.
        
        Args:
            session_id: ID sesji
            set_name: Nazwa zbioru
            values: Lista wartości do dodania
            count: Liczba wystąpień dla każdej wartości (domyślnie 1)
            ttl: Opcjonalny TTL dla tych wartości:
                - None: użyj domyślnego TTL z cache_ttl
                - 0 lub ujemny: klucz trwały (bez wygaśnięcia)
                - Dodatni: użyj podanej wartości jako TTL
            collection_type: Typ kolekcji
        """
        if not values:
            return True
        
        now = datetime.datetime.utcnow()
        
        # Określenie TTL:
        # - None: użyj domyślnej wartości
        # - 0 lub ujemna: bez wygaśnięcia
        # - wartość dodatnia: użyj jako TTL
        use_expiry = True
        if ttl is not None:
            # Gdy ttl jest jawnie określone
            if ttl <= 0:
                # TTL <= 0 oznacza "bez wygaśnięcia"
                use_expiry = False
                item_ttl = -1
            else:
                # Dodatni TTL
                item_ttl = ttl
        else:
            # Gdy ttl jest None, użyj domyślnej wartości
            item_ttl = self.cache_ttl
            # Jeśli domyślny TTL <= 0, nie używaj wygaśnięcia
            use_expiry = self.cache_ttl > 0
        
        # Przygotowujemy operacje w MongoDB dla wszystkich wartości
        for value in values:
            update_data = {
                "$set": {
                    "updated_at": now,
                    f"items.{value}.last_updated": now,
                },
                "$inc": {f"items.{value}.count": count},
                "$setOnInsert": {f"items.{value}.added_at": now}
            }
            
            # Dodaj expires_at tylko jeśli używamy wygaśnięcia i TTL > 0
            if use_expiry and item_ttl > 0:
                expires_at = now + datetime.timedelta(seconds=item_ttl)
                update_data["$set"][f"items.{value}.expires_at"] = expires_at
            elif not use_expiry:
                # Jawnie ustawiamy brak wygaśnięcia - usuwamy pole expires_at jeśli istnieje
                update_data["$unset"] = {f"items.{value}.expires_at": ""}
            
            if collection_type:
                update_data["$set"]["collection_type"] = collection_type
                
            self.mongo_collection.update_one(
                {"session_id": session_id, "set_name": set_name},
                update_data,
                upsert=True
            )
            
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
        
        # Aktualizujemy Redis tylko raz po wszystkich operacjach
        self._update_redis_set_cache(session_id, set_name)
        return True

    def increment_in_set(self, session_id, set_name, value, increment=1):
        """
        Zwiększa licznik dla wartości w zbiorze.
        
        Implementacja wzorca cache-aside - aktualizuje Redis po aktualizacji MongoDB.
        
        Args:
            session_id: ID sesji
            set_name: Nazwa zbioru
            value: Wartość do inkrementacji
            increment: O ile zwiększyć licznik (domyślnie 1)
        """
        now = datetime.datetime.utcnow()
        update_data = {
            "$inc": {f"items.{value}.count": increment},
            "$set": {
                "updated_at": now,
                f"items.{value}.last_updated": now,
            }
        }
        
        # Dodaj expires_at tylko jeśli cache_ttl > 0
        if self.cache_ttl > 0:
            expires_at = now + datetime.timedelta(seconds=self.cache_ttl)
            update_data["$set"][f"items.{value}.expires_at"] = expires_at
        
        result = self.mongo_collection.update_one(
            {
                "session_id": session_id, 
                "set_name": set_name,
                f"items.{value}": {"$exists": True}
            },
            update_data
        )
        
        if result.matched_count == 0:
            # Wartość nie istnieje, dodajemy ją
            return self.add_to_set(session_id, set_name, value, increment)
        
        # Aktualizujemy Redis zamiast usuwać klucz
        self._update_redis_set_cache(session_id, set_name)
        return True

    def update_in_set(self, session_id, set_name, old_value, new_value, preserve_count=True):
        """
        Aktualizuje wartość w zbiorze.
        
        Implementacja wzorca cache-aside - aktualizuje Redis po aktualizacji MongoDB.
        
        Args:
            session_id: ID sesji
            set_name: Nazwa zbioru
            old_value: Stara wartość
            new_value: Nowa wartość
            preserve_count: Czy zachować licznik (domyślnie True)
        """
        now = datetime.datetime.utcnow()
        
        # Pobieramy dane o starej wartości
        doc = self.mongo_collection.find_one(
            {"session_id": session_id, "set_name": set_name}
        )
        
        if not doc or old_value not in doc.get("items", {}):
            return False
            
        old_item_data = doc["items"][old_value]
        count = old_item_data.get("count", 1) if preserve_count else 1
        collection_type = doc.get("collection_type")
        
        # Usuwamy starą wartość
        self.mongo_collection.update_one(
            {"session_id": session_id, "set_name": set_name},
            {"$unset": {f"items.{old_value}": ""}}
        )
        
        # Dodajemy nową wartość z zachowaniem licznika
        update_data = {
            "$set": {
                "updated_at": now,
                f"items.{new_value}.last_updated": now,
                f"items.{new_value}.count": count,
                f"items.{new_value}.added_at": old_item_data.get("added_at", now)
            }
        }
        
        # Dodaj expires_at tylko jeśli cache_ttl > 0
        if self.cache_ttl > 0:
            expires_at = now + datetime.timedelta(seconds=self.cache_ttl)
            update_data["$set"][f"items.{new_value}.expires_at"] = expires_at
        
        if collection_type:
            update_data["$set"]["collection_type"] = collection_type
            
        self.mongo_collection.update_one(
            {"session_id": session_id, "set_name": set_name},
            update_data,
            upsert=True
        )
        
        # Aktualizujemy Redis zamiast usuwać klucz
        self._update_redis_set_cache(session_id, set_name)
        
        # Aktualizujemy klucz wyszukiwania w Redis Stack
        if collection_type:
            old_search_key = f"search:{session_id}:{set_name}:{old_value}"
            self.redis_client.delete(old_search_key)
            
            new_search_key = f"search:{session_id}:{set_name}:{new_value}"
            search_data = {
                "session_id": session_id,
                "collection_type": collection_type,
                "set_name": set_name,
                "value": new_value
            }
            self.redis_client.hset(new_search_key, mapping=search_data)
            if self.cache_ttl > 0:
                self.redis_client.expire(new_search_key, self.cache_ttl)
        
        return True

    def delete_from_set(self, session_id, set_name, value, decrement=1):
        """
        Usuwa wartość ze zbioru lub zmniejsza jej licznik.
        
        Implementacja wzorca cache-aside - aktualizuje Redis po aktualizacji MongoDB.
        Jeśli licznik wartości jest większy niż podana wartość dekrementacji, 
        zmniejsza go o tę wartość. Jeśli licznik osiągnie 0 lub mniej, całkowicie usuwa wartość.
        
        Args:
            session_id: ID sesji
            set_name: Nazwa zbioru
            value: Wartość do usunięcia/zmniejszenia
            decrement: O ile zmniejszyć licznik (domyślnie 1)
        """
        now = datetime.datetime.utcnow()
        
        # Pobieramy dokument, aby sprawdzić wartość licznika
        doc = self.mongo_collection.find_one(
            {"session_id": session_id, "set_name": set_name}
        )
        
        if not doc or "items" not in doc or value not in doc["items"]:
            return False
        
        collection_type = doc.get("collection_type")
        item_data = doc["items"][value]
        current_count = item_data.get("count", 1)
        
        # Jeśli licznik > decrement, zmniejszamy go
        if current_count > decrement:
            result = self.mongo_collection.update_one(
                {"session_id": session_id, "set_name": set_name},
                {
                    "$inc": {f"items.{value}.count": -decrement},
                    "$set": {
                        "updated_at": now,
                        f"items.{value}.last_updated": now
                    }
                }
            )
        else:
            # W przeciwnym razie usuwamy element całkowicie
            result = self.mongo_collection.update_one(
                {"session_id": session_id, "set_name": set_name},
                {
                    "$unset": {f"items.{value}": ""},
                    "$set": {"updated_at": now}
                }
            )
            
            # Usuwamy klucz wyszukiwania z Redis Stack
            if collection_type:
                search_key = f"search:{session_id}:{set_name}:{value}"
                self.redis_client.delete(search_key)
        
        # Aktualizujemy Redis po zmianach w MongoDB
        self._update_redis_set_cache(session_id, set_name)
        
        return True

    def delete_many_from_set(self, session_id, set_name, values, decrement=1):
            """
            Usuwa wiele wartości ze zbioru lub zmniejsza ich liczniki.
            
            Zoptymalizowana implementacja wzorca cache-aside - aktualizuje Redis tylko raz na końcu.
            Dla każdej wartości, jeśli jej licznik jest większy niż podana wartość dekrementacji,
            zmniejsza go o tę wartość. Jeśli licznik osiągnie 0 lub mniej, całkowicie usuwa wartość.
            
            Args:
                session_id: ID sesji
                set_name: Nazwa zbioru
                values: Lista wartości do usunięcia/zmniejszenia
                decrement: O ile zmniejszyć licznik dla każdej wartości (domyślnie 1)
            """
            if not values:
                return True
            
            now = datetime.datetime.utcnow()
            
            # Pobieramy dokument ze wszystkimi elementami
            doc = self.mongo_collection.find_one(
                {"session_id": session_id, "set_name": set_name}
            )
            
            if not doc or "items" not in doc:
                return False
            
            collection_type = doc.get("collection_type")
            
            for value in values:
                if value in doc["items"]:
                    current_count = doc["items"][value].get("count", 1)
                    
                    # Jeśli licznik > decrement, zmniejszamy go
                    if current_count > decrement:
                        self.mongo_collection.update_one(
                            {"session_id": session_id, "set_name": set_name},
                            {
                                "$inc": {f"items.{value}.count": -decrement},
                                "$set": {
                                    "updated_at": now,
                                    f"items.{value}.last_updated": now
                                }
                            }
                        )
                    else:
                        # W przeciwnym razie usuwamy element całkowicie
                        self.mongo_collection.update_one(
                            {"session_id": session_id, "set_name": set_name},
                            {
                                "$unset": {f"items.{value}": ""},
                                "$set": {"updated_at": now}
                            }
                        )
                        
                        # Usuwamy klucz wyszukiwania z Redis Stack
                        if collection_type:
                            search_key = f"search:{session_id}:{set_name}:{value}"
                            self.redis_client.delete(search_key)
            
            # Aktualizujemy Redis tylko raz po wszystkich operacjach
            self._update_redis_set_cache(session_id, set_name)
            
            return True

    def search_keys(self, session_id=None, collection_type=None, pattern=None, limit=100, offset=0):
        """
        Wyszukuje klucze na podstawie kryteriów.
        
        Implementacja wzorca cache-aside - używa Redis Stack do szybkiego wyszukiwania,
        z fallbackiem do MongoDB jeśli Redis Stack nie jest dostępny.
        
        Args:
            session_id: Opcjonalne ID sesji
            collection_type: Opcjonalny typ kolekcji
            pattern: Opcjonalny wzorzec wyszukiwania wartości
            limit: Limit wyników
            offset: Przesunięcie wyników
        """
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
            
            # Fallback do MongoDB jeśli Redis Stack nie działa
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