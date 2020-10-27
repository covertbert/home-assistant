#!/usr/bin/env bash

user="$1"
host="$2"

rsync -avO --no-perms ./config/ "$user@$host:/config/"
