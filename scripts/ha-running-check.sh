#!/usr/bin/env bash

haURL=$1
token=$2

until curl -X GET \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" "$haURL"/api/; do
  sleep 2
done
