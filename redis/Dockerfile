FROM redis:8.0-M04-bookworm
 
COPY redis.conf /usr/local/etc/redis/redis.conf

RUN chmod +777 /data

EXPOSE 6379

CMD [ "redis-server", "/usr/local/etc/redis/redis.conf" ]