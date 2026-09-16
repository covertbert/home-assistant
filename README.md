# Home Assistant 🏠

Version-controlled Home Assistant config for the whole house. Every light, radiator, rate tracker and alert lives here as plain YAML, so the home is a repo: reviewable, rollback-able, and checkable in CI. 🗃️✅

## 🗺️ Layout

| Path                 | What's in it                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `configuration.yaml` | Entry point — pulls in every package under `integrations/`                                               |
| `integrations/`      | One file per integration: scripts, templates, scenes, alerts, ZHA 📶, HomeKit 🍎, shell commands, groups |
| `automations/`       | All automations, split by area and concern                                                               |
| `entities/`          | Helpers: template sensors, input booleans, groups                                                        |
| `www/`               | Custom Lovelace cards — vanilla JS, zero build step 🪄                                                   |
| `shell/`             | `git_pull.sh` for HA and `config_check.sh` for validation                                                |
| `.stubs/`            | Mock secrets so config checks run without the real ones 🔐                                               |

## ⚡ What it does

- 🔥 **Room-by-room heating** — schedules for attic, basement, bathroom, bedroom, downstairs and nursery, with window-open cut-offs so we never heat an empty, open room 🪟
- 💡 **Presence-aware lights** — a single `home_state` toggle drives lighting, with per-area schedules
- 🏃 **Housesitter mode** — flip one input boolean and the routines keep working sanely when the family's away
- 🧺 **Dehumidifier** — basement humidity control, also window-aware
- ⚡ **Octopus Agile** — current and upcoming rate card, an average-rate template, and a cheap-energy flag that flips on when a rate undercuts the average 📉
- 🎡 **Wheel of Fortune** — persistent notification when Octopus WOF spins land, so they never go unclaimed
- 🩺 **System health** — one aggregate sensor watches repairs, low batteries, stuck-unavailable entities and pending updates, then pushes native alerts to the phone (repeat daily until fixed, clears on recovery)
- 🛌 **Startup / shutdown** — house-level routines for boot and power-down, plus auto-restart on config updates
- 📶 **Zigbee (ZHA)** — sensors and switches on the mesh
- 🍎 **HomeKit** — the house in Apple Home, too

## 🖥️ Custom cards

Hand-rolled Lovelace cards in `www/` — plain JS, no dependencies, no build step:

- 🏡 `home-overview-card.js` — at-a-glance home state, who's here, key toggles
- 🌡️ `heating-control-card.js` — a week view of room heating schedules
- 💷 `agile-rates-card.js` — Octopus Agile rates table

### UI preview

Use direct SSH upload for fast visual iteration. Local repository stays source of truth. HA `/config/www` is preview target only.

```sh
node --check www/heating-control-card.js
scp www/heating-control-card.js homeassistant:/config/www/heating-control-card.js
```

Open browser DevTools, enable **Disable cache**, then reload dashboard. Review before another change. Do not commit or push a preview upload directly.

Before final local commit and push, restore previewed files on HA and require clean worktree:

```sh
ssh homeassistant '
  cd /config &&
  git restore --source=HEAD --staged --worktree -- www/heating-control-card.js &&
  test -z "$(git status --porcelain)"
'
```

GitHub Actions triggers deployment after push. Clean HA worktree lets deployment webhook pull final commit. Custom-card resource URLs remain unversioned, for example `/local/heating-control-card.js`.

## 🤖 Automations

```
automations/
├── home/     # home state, presence lights
├── sensors/  # cheap electricity
├── system/   # startup, shutdown, config-update restart, Octopus WOF
└── areas/    # per room: heating, windows, lights, dehumidifiers
```

Naming follows `<domain>.<room-or-scope>.<what>.yaml`, e.g. `heating.bedroom.window.yaml`.

## 🛠️ Tooling & checks

- 🔒 **Lefthook** — pre-commit: Prettier, yamllint, JS syntax, ShellCheck. Pre-push: full HA config check
- ☁️ **GitHub Actions** — the same validation on every push and PR
- 🧪 **`shell/config_check.sh`** — spins up a real Home Assistant container (default `stable`, pin with `HA_VERSION=x.y`) and runs `check_config` against the repo, using the stubbed secrets
- 📝 **`automations.yaml`** — keeps the automation list in sync

## 📏 Conventions

- One automation per file, name says what it is 🏷️
- Secrets go in `secrets.yaml` (gitignored) and are mocked in `.stubs/mock_secrets.yaml` for CI
- Templates, input booleans and groups live in `entities/`, not sprinkled through integrations
- Config changes are reviewed like code: commit, push, let CI check it 🐙
