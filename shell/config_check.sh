#!/usr/bin/env bash
# Validate HA config in a container.
# Trusts the check_config exit code (substring matching misses fatal errors).
# Pulls the image so "stable" never goes silently stale.
# Pin an exact release with: HA_VERSION=2026.1 ./shell/config_check.sh
set -u

HA_VERSION="${HA_VERSION:-stable}"
image="homeassistant/home-assistant:${HA_VERSION}"

docker pull "$image" >/dev/null 2>&1 || {
  echo "docker pull ${image} failed"
  exit 1
}

# Stub secrets so !secret refs resolve (secrets.yaml is gitignored).
cp ./.stubs/mock_secrets.yaml ./secrets.yaml

log="$(mktemp)"
docker run --rm --name ha-config-check -v "$PWD:/config" "$image" \
  bash -c "python -m homeassistant --script check_config --config /config" \
  >"$log" 2>&1
rc=$?
rm -f ./secrets.yaml

# rc != 0: invalid config, fatal load error, or docker failure.
if [[ $rc -ne 0 ]]; then
  echo "Config check FAILED (exit ${rc}):"
  cat "$log"
  rm -f "$log"
  exit 1
fi

# check_config exits 0 for warnings/deprecations ("Incorrect config") - fail those too.
if grep -q "Incorrect config" "$log"; then
  echo "Config check FAILED (deprecations/warnings):"
  cat "$log"
  rm -f "$log"
  exit 1
fi

echo "Config OK (HA ${HA_VERSION})"
rm -f "$log"
