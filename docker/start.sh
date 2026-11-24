#!/bin/sh
set -eu
umask 077
# Keep Spring's local-settings restriction: all proxied requests arrive on loopback.
nginx -c /app/nginx.conf
exec java -jar /app/server.jar
