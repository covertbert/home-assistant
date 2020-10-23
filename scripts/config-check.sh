#!/usr/bin/env bash

# cp ./ci/mock_secrets.yaml ./secrets.yaml
cp -r ./ci/ssl/ ./ssl/
docker run --name=home-assistant -v "$PWD"/:/config homeassistant/home-assistant:stable bash -c "python -m homeassistant --script check_config --config ./ --info all"

docker kill home-assistant || :
docker rm home-assistant || :
