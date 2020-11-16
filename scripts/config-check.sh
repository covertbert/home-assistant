#!/usr/bin/env bash

function killDocker() {
  docker kill home-assistant >>/dev/null 2>&1
  docker rm home-assistant >>/dev/null 2>&1
}

function copyStubbedData() {
  cp ./.stubs/mock_secrets.yaml ./config/secrets.yaml
  cp -r ./.stubs/ssl/ ./config/ssl/
}

function checkHaConfig() {
  configCheckOutput=$(docker run --name=home-assistant -v "$PWD"/config:/config homeassistant/home-assistant:stable bash -c "python -m homeassistant --script check_config --config ./ --info all")

  if [[ $? == 125 ]]; then
    exit 1
  fi

  if [[ $configCheckOutput == *"Failed config"* ]]; then
    echo "$configCheckOutput"
    exit 1
  else
    echo "Config looks lit 🔥"
  fi
}

function cleanWorkingDirectory() {
  cd ./config || exit 1
  rm -rf .cloud .storage .HA_VERSION home-assistant_v2.db home-assistant.log secrets.yaml ssl
}

killDocker

copyStubbedData
checkHaConfig

killDocker
cleanWorkingDirectory
