#!/bin/bash

DOMAIN=$DOMAIN
TOKEN_DUCKDNS=$TOKEN_DUCKDNS

RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN_DUCKDNS&txt=&clear=true")

if [ "$RESPONSE" != "OK" ]; then
    echo "Failed to clear DuckDNS TXT record. Response: $RESPONSE"
    exit 1
fi

echo "DuckDNS TXT record cleared successfully."