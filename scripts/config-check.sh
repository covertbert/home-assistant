#!/usr/bin/env bash

docker kill home-assistant || :
docker rm home-assistant || :

cp ./ci/mock_secrets.yaml ./secrets.yaml
cp -r ./ci/ssl/ ./ssl/
configCheckOutput=$(docker run --name=home-assistant -v "$PWD"/:/config homeassistant/home-assistant:stable bash -c "python -m homeassistant --script check_config --config ./ --info all")

if [[ $configCheckOutput == *"Failed config"* ]]; then
  exit 1
fi
