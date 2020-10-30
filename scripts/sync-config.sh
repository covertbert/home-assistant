#!/usr/bin/env bash

user="$1"
host="$2"
restartWebhookURL="$3"

rsync -avO \
  --no-perms \
  --include={'automations/***','customizations/***','entities/***','lovelace/***','integrations/***','scenes/***','scripts/***','themes/***','www/***','automations.yaml','configuration.yaml','ui-lovelace.yaml'} \
  --exclude="*" \
  --delete \
  ./config/ "$user@$host:/config/"

curl -X POST "$restartWebhookURL"
