#!/usr/bin/env bash

function killDocker() {
  docker kill home-assistant >>/dev/null 2>&1
  docker rm home-assistant >>/dev/null 2>&1
}

function copyStubbedData() {
  cp ./.stubs/mock_secrets.yaml ./config/secrets.yaml
  cp ./.stubs/SERVICE_ACCOUNT.json ./config/SERVICE_ACCOUNT.json
  cp -r ./.stubs/ssl/ ./config/ssl/
}

function cleanWorkingDirectory() {
  cd ./config || exit 1
  rm -rf .cloud .storage .HA_VERSION home-assistant_v2.db home-assistant.log secrets.yaml ssl SERVICE_ACCOUNT.json
}

function checkHaConfig() {
  configCheckOutput=$(docker run --name=home-assistant -v "$PWD"/config:/config homeassistant/home-assistant:stable bash -c "python -m homeassistant --script check_config --config ./ --info all")

  if [[ $? == 125 ]]; then
    exit 1
  fi

  if [[ $configCheckOutput == *"Failed config"* ]]; then
    echo "$configCheckOutput"
    cleanWorkingDirectory
    killDocker
    exit 1
  else
    echo "Config looks lit 🔥"
    cleanWorkingDirectory
    killDocker
  fi
}

copyStubbedData
checkHaConfig
