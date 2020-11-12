#!/usr/bin/env bash

signInAddress=$1
emailAddress=$2
password=$3
secretKey=$4
# deviceID=$5

function checkVersion() {
  echo "1Password version: $(op --version)"
}

function signIn() {
  # export OP_DEVICE="$deviceID"
  eval "$(echo "$password" | op signin "$signInAddress" "$emailAddress" "$secretKey")"
}

function getHASecrets() {
  op list items --tags ha-secrets | op get item - --fields notesPlain
}

checkVersion
signIn
getHASecrets
