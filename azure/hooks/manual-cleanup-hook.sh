#!/bin/bash

DOMAIN=dietmate3.duckdns.org
TOKEN_DUCKDNS=f898f46c-fc8d-458d-8948-23a79b0be79c

RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN_DUCKDNS&txt=&clear=true")

if [ "$RESPONSE" != "OK" ]; then
    echo "Failed to clear DuckDNS TXT record. Response: $RESPONSE"
    exit 1
fi

echo "DuckDNS TXT record cleared successfully."