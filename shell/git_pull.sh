#!/bin/sh

git pull || exit 1

resources=.storage/lovelace_resources
[ -f "$resources" ] || exit 0

version=$(git rev-parse --short HEAD) || exit 1
tmp=$(mktemp "${resources}.XXXXXX") || exit 1
trap 'rm -f "$tmp"' EXIT
jq --arg version "$version" '
  .data.items |= map(
    if (.url | startswith("/local/"))
    then .url = (.url | split("?")[0] + "?v=" + $version)
    else .
    end
  )
' "$resources" >"$tmp" || exit 1
mv "$tmp" "$resources"
