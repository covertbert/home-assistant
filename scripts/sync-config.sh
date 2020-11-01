#!/usr/bin/env bash

user="$1"
host="$2"
restartWebhookURL="$3"

if [[ -z "$user" || -z "$host" ]]; then
  echo "Missing either user or host inputs"
  exit 1
fi

function syncFiles() {
  echo "Synching files..."

  rsync -avO \
    --no-perms \
    --include={'automations/***','customizations/***','entities/***','lovelace/***','integrations/***','scenes/***','scripts/***','themes/***','www/***','custom_components/***','automations.yaml','configuration.yaml','ui-lovelace.yaml'} \
    --exclude="*" \
    --delete \
    ./config/ "$user@$host:/config/"

  echo "Done!"
}

function restartServer() {
  echo "Restarting server..."
  curl -X POST "$restartWebhookURL"
}

syncFiles

if [[ -n "$restartWebhookURL" ]]; then
  restartServer
fi
