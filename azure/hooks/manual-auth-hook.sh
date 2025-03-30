#!/bin/bash

LOGFILE="/tmp/certbot_duckdns.log"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGFILE"
}

DUCKDNS_SUBDOMAIN=$(echo "$CERTBOT_DOMAIN" | sed -E 's/(.*)\.duckdns\.org/\1/')

RECORD_NAME="_acme-challenge.${CERTBOT_DOMAIN}"
VALUE="${CERTBOT_VALIDATION}"

log_message "CERTBOT_DOMAIN: $CERTBOT_DOMAIN"
log_message "DUCKDNS_SUBDOMAIN: $DUCKDNS_SUBDOMAIN"
log_message "RECORD_NAME: $RECORD_NAME"
log_message "VALUE: $VALUE"

log_message "Updating DNS record with DuckDNS API"

MAX_RETRIES=3
for ((i=1; i<=MAX_RETRIES; i++)); do
    RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$DUCKDNS_SUBDOMAIN&token=$TOKEN_DUCKDNS&txt=$VALUE")
    log_message "DuckDNS API response: $RESPONSE"
    
    if [ "$RESPONSE" = "OK" ]; then
        log_message "DNS record updated successfully"
        break
    else
        log_message "Failed to update DNS record (attempt $i/$MAX_RETRIES)"
        log_message "Command: curl -s 'https://www.duckdns.org/update?domains=$DUCKDNS_SUBDOMAIN&token=[REDACTED]&txt=$VALUE'"
        if [ $i -eq $MAX_RETRIES ]; then
            log_message "ERROR: Failed to update DuckDNS record after $MAX_RETRIES attempts"
            exit 1
        fi
        sleep 5
    fi
done

log_message "Waiting for DNS propagation..."
WAIT_TIME=120
sleep 30

for ((i=1; i<=WAIT_TIME; i+=10)); do
    log_message "Checking DNS propagation (waited ${i}s)"
    
    GOOGLE_RESULT=$(dig +short -t TXT "$RECORD_NAME" @8.8.8.8)
    log_message "Google DNS result: $GOOGLE_RESULT"
    
    CF_RESULT=$(dig +short -t TXT "$RECORD_NAME" @1.1.1.1)
    log_message "Cloudflare DNS result: $CF_RESULT"
    
    if [[ "$GOOGLE_RESULT" == *"$VALUE"* ]] || [[ "$CF_RESULT" == *"$VALUE"* ]]; then
        log_message "DNS propagation confirmed after ${i} seconds"
        exit 0
    fi
    
    sleep 10
done

log_message "ERROR: DNS propagation timeout