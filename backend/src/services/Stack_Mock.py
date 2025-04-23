
import os
import redis


redis_cloud_host = os.getenv("REDIS_CLOUD_HOST", None)
redis_cloud_password = os.getenv("REDIS_CLOUD_PASSWORD", None)
if redis_cloud_host and redis_cloud_password:
    r = redis.Redis(
        host=redis_cloud_host,
        port=15355,
        username="default",
        password=redis_cloud_password,
    )

class RedisStack:
    def __init__(self, stack_name="history", namespace="stack"):
        """
        Inicjalizuje stos Redis.
        
        Args:
            redis_client: Klient Redis
            stack_name: Nazwa stosu
            namespace: Przestrzeń nazw do grupowania stosów (domyślnie "stack")
        """
        self.redis = r
        self.key = f"{namespace}:{stack_name}"
        
    def size(self):
        """Zwraca wielkość stosu."""
        return self.redis.llen(self.key)
    
    def is_empty(self):
        """Sprawdza czy stos jest pusty."""
        return self.size() == 0
        
    def push(self, item):
        """
        Dodaje element na wierzch stosu.
        
        Args:
            item: Element do dodania
        """
        self.redis.lpush(self.key, item)
        
    def pop(self):
        """
        Pobiera element z wierzchu stosu.
        
        Returns:
            Element ze stosu lub None, jeśli stos jest pusty
        """
        return self.redis.lpop(self.key)
            
    def peek(self):
        """
        Podgląda element na wierzchu stosu bez usuwania go.
        
        Returns:
            Element na wierzchu lub None, jeśli stos jest pusty
        """
        if self.is_empty():
            return None
        return self.redis.lindex(self.key, 0)
        
    def clear(self):
        """Czyści stos."""
        self.redis.delete(self.key)