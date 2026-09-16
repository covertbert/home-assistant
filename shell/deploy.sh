#!/usr/bin/env bash
set -Eeuo pipefail

: "${GITHUB_SHA:?GITHUB_SHA is required}"
: "${HA_TOKEN:?HA_TOKEN is required}"
: "${HA_SSH_KEY_FILE:?HA_SSH_KEY_FILE is required}"

HA_HOST="${HA_HOST:-homeassistant.mole-anaconda.ts.net}"
HA_URL="${HA_URL:-https://homeassistant.mole-anaconda.ts.net}"
SSH_TARGET="root@${HA_HOST}"
DEPLOY_ROOT="/config/.ha-deploy"
SHORT_SHA="$(git rev-parse --short=12 "$GITHUB_SHA")"
KNOWN_HOSTS_FILE="${HA_KNOWN_HOSTS_FILE:-$HOME/.ssh/known_hosts}"
SSH_OPTS=(-i "$HA_SSH_KEY_FILE" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=15 -o UserKnownHostsFile="$KNOWN_HOSTS_FILE" -o StrictHostKeyChecking=yes)

ssh_ha() {
  # shellcheck disable=SC2029
  ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "$@"
}

is_runtime_path() {
  case "$1" in
    configuration.yaml|automations.yaml|automations/*|entities/*|integrations/*|scenes/*|scripts/*|themes/*|www/*.js|shell/git_pull.sh)
      return 0 ;;
    *) return 1 ;;
  esac
}

REMOTE_REVISION="$(ssh_ha "cat ${DEPLOY_ROOT}/revision 2>/dev/null || true")"
BASE_REVISION="$REMOTE_REVISION"
if [[ -z "$BASE_REVISION" ]]; then
  BASE_REVISION="${GITHUB_EVENT_BEFORE:-}"
  [[ "$BASE_REVISION" =~ ^0+$ ]] && BASE_REVISION=""
fi

CHANGED_FILES=()
if [[ -n "$BASE_REVISION" ]] && git cat-file -e "$BASE_REVISION^{commit}" 2>/dev/null; then
  mapfile -t CHANGED_FILES < <(git diff --name-only "$BASE_REVISION" "$GITHUB_SHA")
else
  mapfile -t CHANGED_FILES < <(git diff-tree --root --no-commit-id --name-only -r "$GITHUB_SHA")
fi

RUNTIME_CHANGED=0
HAS_RUNTIME_DIFF=0
for file in "${CHANGED_FILES[@]}"; do
  if is_runtime_path "$file"; then
    RUNTIME_CHANGED=1
    HAS_RUNTIME_DIFF=1
    break
  fi
done
[[ "${GITHUB_EVENT_NAME:-}" == workflow_dispatch ]] && RUNTIME_CHANGED=1

if [[ -z "$REMOTE_REVISION" && "$RUNTIME_CHANGED" -eq 0 ]]; then
  # First runtime deployment will perform migration. Docs/tooling commits wait.
  echo "No runtime changes; migration deferred"
  exit 0
fi

RESTART=0
VERSION_RESOURCES=0
declare -a RELOADS=()
declare -A SEEN_RELOADS=()
add_reload() {
  local service="$1"
  if [[ -z "${SEEN_RELOADS[$service]+x}" ]]; then
    RELOADS+=("$service")
    SEEN_RELOADS[$service]=1
  fi
}

for file in "${CHANGED_FILES[@]}"; do
  case "$file" in
    www/*.js) VERSION_RESOURCES=1 ;;
    configuration.yaml|integrations/default_config.yaml|integrations/alert.yaml|integrations/zha.yaml|integrations/frontend.yaml|integrations/automation.yaml|integrations/*.py|custom_components/*)
      RESTART=1 ;;
    automations.yaml|automations/*) add_reload automation.reload ;;
    entities/groups/*|integrations/groups.yaml|groups/*) add_reload group.reload ;;
    entities/input_booleans/*|integrations/input_boolean.yaml) add_reload input_boolean.reload ;;
    entities/templates/*|integrations/template.yaml) add_reload template.reload ;;
    entities/timers/*|integrations/timer.yaml) add_reload timer.reload ;;
    integrations/homekit.yaml) add_reload homekit.reload ;;
    integrations/scene.yaml|scenes/*) add_reload scene.reload ;;
    integrations/script.yaml|scripts/*) add_reload script.reload ;;
    integrations/shell_command.yaml) add_reload shell_command.reload ;;
    themes/*) add_reload frontend.reload_themes ;;
    integrations/*.yaml|entities/*.yaml)
      RESTART=1 ;;
    shell/*) ;;
    *.md|.github/*|.gitignore|.nvmrc|.prettierignore|.prettierrc|.stubs/*|.vscode/*|.yamllint|lefthook.yaml)
      ;;
    *) RESTART=1 ;;
  esac
done

if [[ "${GITHUB_EVENT_NAME:-}" == workflow_dispatch && -n "$REMOTE_REVISION" && "$HAS_RUNTIME_DIFF" -eq 0 ]]; then
  # Manual dispatch reconciles in-memory YAML after out-of-band maintenance.
  RESTART=0
  RELOADS=(homeassistant.reload_all)
fi

if [[ "$RESTART" -eq 1 ]]; then
  RELOADS=()
  echo "Apply: restart"
elif ((${#RELOADS[@]})); then
  echo "Apply: reload ${RELOADS[*]}"
elif [[ "$VERSION_RESOURCES" -eq 1 ]]; then
  echo "Apply: Lovelace resources only"
else
  echo "Apply: files only"
fi

PAYLOAD_DIR="$(mktemp -d)"
PAYLOAD="$(mktemp "${TMPDIR:-/tmp}/ha-payload.XXXXXX.tgz")"
cleanup() { rm -rf "$PAYLOAD_DIR" "$PAYLOAD"; }
trap cleanup EXIT

# Copy tracked runtime files only. Ignored local files never enter deployment archive.
while IFS= read -r -d '' file; do
  case "$file" in
    configuration.yaml|automations.yaml|automations/*|entities/*|integrations/*|scenes/*|scripts/*|themes/*|www/*.js)
      mkdir -p "$PAYLOAD_DIR/$(dirname "$file")"
      cp -p "$file" "$PAYLOAD_DIR/$file" ;;
  esac
done < <(git ls-files -z)

tar -C "$PAYLOAD_DIR" -czf "$PAYLOAD" .
MIGRATION=0
[[ -z "$REMOTE_REVISION" ]] && MIGRATION=1

ssh_ha "mkdir -p ${DEPLOY_ROOT}; rm -f ${DEPLOY_ROOT}/payload-${SHORT_SHA}.tgz"
# shellcheck disable=SC2029
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "cat > ${DEPLOY_ROOT}/payload-${SHORT_SHA}.tgz" < "$PAYLOAD"

ssh "${SSH_OPTS[@]}" "$SSH_TARGET" bash -s -- "$SHORT_SHA" "$MIGRATION" <<'REMOTE_PROMOTE'
set -Eeuo pipefail
sha="$1"
migration="$2"
root=/config
state=/config/.ha-deploy
stage="$state/stage-$sha"
backup="$state/backup-$sha"
payload="$state/payload-$sha.tgz"
managed_dirs=(automations entities integrations scenes scripts themes www)
managed_files=(configuration.yaml automations.yaml)

rm -rf "$stage" "$backup"
mkdir -p "$stage" "$backup"
tar -xzf "$payload" -C "$stage"
for dir in "${managed_dirs[@]}"; do mkdir -p "$stage/$dir"; done

# HACS owns this subtree; carry it through Git-owned www replacement untouched.
if [ -d "$root/www/community" ]; then
  cp -a "$root/www/community" "$stage/www/"
fi

move_to_backup() {
  local path="$1"
  mkdir -p "$backup/$(dirname "$path")"
  if [ -e "$root/$path" ] || [ -L "$root/$path" ]; then
    mv "$root/$path" "$backup/$path"
  fi
  mv "$stage/$path" "$root/$path"
}

restore() {
  trap - ERR
  for path in "${managed_files[@]}" "${managed_dirs[@]}"; do
    rm -rf "$root/$path"
    if [ -e "$backup/$path" ] || [ -L "$backup/$path" ]; then
      mv "$backup/$path" "$root/$path"
    fi
  done
  rm -rf "$stage" "$backup" "$payload"
}

# Any promotion error restores old managed files before returning failure.
trap restore ERR
for path in "${managed_files[@]}" "${managed_dirs[@]}"; do move_to_backup "$path"; done
rm -f "$payload"

# Caller applies reload/restart after this check. Invalid candidate never becomes live.
if ! ha core check >/tmp/ha-deploy-check.log 2>&1; then
  cat /tmp/ha-deploy-check.log
  restore
  exit 1
fi
REMOTE_PROMOTE

rollback() {
  ssh "${SSH_OPTS[@]}" "$SSH_TARGET" bash -s -- "$SHORT_SHA" <<'REMOTE_ROLLBACK'
set -Eeuo pipefail
sha="$1"
root=/config
state=/config/.ha-deploy
stage="$state/stage-$sha"
backup="$state/backup-$sha"
managed_dirs=(automations entities integrations scenes scripts themes www)
managed_files=(configuration.yaml automations.yaml)
for path in "${managed_files[@]}" "${managed_dirs[@]}"; do
  rm -rf "$root/$path"
  if [ -e "$backup/$path" ] || [ -L "$backup/$path" ]; then mv "$backup/$path" "$root/$path"; fi
done
rm -rf "$stage" "$backup" "$state/payload-$sha.tgz"
REMOTE_ROLLBACK
}

ha_api() {
  curl --fail --silent --show-error --retry 2 \
    -H "Authorization: Bearer $HA_TOKEN" \
    -H 'Content-Type: application/json' "$@"
}

restart_ha() {
  ssh_ha 'nohup sh -c "sleep 2; ha core restart" >/tmp/ha-deploy-restart.log 2>&1 </dev/null &'
  for _ in $(seq 1 36); do
    sleep 5
    if ha_api "$HA_URL/api/" >/dev/null 2>&1; then return 0; fi
  done
  return 1
}

APPLY_OK=1
if [[ "$RESTART" -eq 1 ]]; then
  restart_ha || APPLY_OK=0
else
  for service in "${RELOADS[@]}"; do
    domain="${service%%.*}"
    name="${service#*.}"
    if ! ha_api -X POST "$HA_URL/api/services/$domain/$name" -d '{}' >/dev/null; then
      APPLY_OK=0
      break
    fi
  done
  if [[ "$APPLY_OK" -eq 1 && "$VERSION_RESOURCES" -eq 1 ]]; then
    if ! HA_TOKEN="$HA_TOKEN" HA_URL="$HA_URL" HA_VERSION="$SHORT_SHA" node shell/version_lovelace_resources.mjs; then
      APPLY_OK=0
    fi
  fi
fi

if [[ "$APPLY_OK" -eq 0 ]]; then
  echo "Apply failed; restoring previous managed files"
  rollback
  # Restore runtime state after rollback. Failure remains visible to Actions.
  restart_ha || true
  exit 1
fi

ssh "${SSH_OPTS[@]}" "$SSH_TARGET" bash -s -- "$SHORT_SHA" "$MIGRATION" <<'REMOTE_FINALIZE'
set -Eeuo pipefail
sha="$1"
migration="$2"
root=/config
state=/config/.ha-deploy
backup="$state/backup-$sha"
rm -rf "$backup" "$state/stage-$sha"
if [ "$migration" = 1 ]; then
  rm -rf "$root/.git" "$root/.github" "$root/.stubs" "$root/.vscode" "$root/shell"
  rm -f "$root/.gitignore" "$root/.yamllint" "$root/.prettierignore" "$root/.prettierrc" "$root/.nvmrc" "$root/AGENTS.md" "$root/README.md" "$root/lefthook.yaml"
  find "$root" -maxdepth 1 -type f -name 'PLAN*.md' -delete
fi
printf '%s\n' "$sha" > "$state/revision"
REMOTE_FINALIZE

echo "Deploy OK: $SHORT_SHA"
