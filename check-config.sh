#!/bin/bash

mkdir /ssl
touch /ssl/fullchain.pem
touch /ssl/privkey.pem
python -m homeassistant --script check_config --config ./ --info all