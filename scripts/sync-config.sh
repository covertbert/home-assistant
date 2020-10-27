#!/usr/bin/env bash

user="$1"
host="$2"

rsync -avO \
  --no-perms \
  --include={'automations/***','customizations/***','entities/***','frontend/***','integrations/***','scenes/***','scripts/***','themes/***','automations.yaml','configuration.yaml','ui-lovelace.yaml'} \
  --exclude="*" \
  --delete \
  ./config/ "$user@$host:/config/"
