#!/usr/bin/env bash

function killDocker() {
  docker kill home-assistant >>/dev/null 2>&1
  docker rm home-assistant >>/dev/null 2>&1
}

function copyStubbedData() {
  cp ./ci/mock_secrets.yaml ./secrets.yaml
  cp -r ./ci/ssl/ ./ssl/
}

function checkHaConfig() {
  configCheckOutput=$(docker run --name=home-assistant -v "$PWD"/:/config homeassistant/home-assistant:stable bash -c "python -m homeassistant --script check_config --config ./ --info all")

  if [[ $configCheckOutput == *"Failed config"* ]]; then
    echo "$configCheckOutput"
    exit 1
  else
    echo "Config looks lit 🔥"
  fi
}

function cleanWorkingDirectory() {
  rm -rf .cloud .storage .HA_VERSION home-assistant_v2.db home-assistant.log secrets.yaml ssl
}

killDocker

copyStubbedData
checkHaConfig

killDocker
cleanWorkingDirectory
