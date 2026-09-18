# Home Assistant 🏠

Version-controlled Home Assistant config for the whole house. Every light, radiator, rate tracker and alert lives here as plain YAML, so the home is a repo: reviewable, rollback-able, and checkable in CI. 🗃️✅

## 🗺️ Layout

| Path                 | What's in it                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `configuration.yaml` | Entry point — pulls in every package under `integrations/`                                               |
| `integrations/`      | One file per integration: scripts, templates, scenes, alerts, ZHA 📶, HomeKit 🍎, shell commands, groups |
| `automations/`       | All automations, split by area and concern                                                               |
| `dashboards/`        | YAML dashboard shells that mount repo-owned custom cards                                                 |
| `entities/`          | Helpers: template sensors, input booleans, numbers, groups                                               |
| `pyscript/`          | Python scripts — system log error buffer (sanitized, 24h window)                                         |
| `www/`               | Custom Lovelace cards — vanilla JS, zero build step 🪄                                                   |
| `shell/`             | CI validation, deployment scripts, and unit tests                                                        |
| `.stubs/`            | Mock secrets so config checks run without the real ones 🔐                                               |

## ⚡ What it does

- 🔥 **Room-by-room heating** — schedules for attic, basement, bathroom, bedroom, downstairs and nursery, with window-open cut-offs so we never heat an empty, open room 🪟
- 💡 **Presence-aware lights** — a single `home_state` toggle drives lighting, with per-area schedules
- 🏃 **Housesitter mode** — flip one input boolean and the routines keep working sanely when the family's away
- 🧺 **Dehumidifier** — basement humidity control, also window-aware
- ⚡ **Octopus Agile** — current and upcoming rate card, an average-rate template, and a cheap-energy flag that flips on when a rate undercuts the average 📉
- 🎡 **Wheel of Fortune** — persistent notification when Octopus WOF spins land, so they never go unclaimed
- 🩺 **System health** — one aggregate sensor watches repairs, low batteries, stuck-unavailable entities, pending updates and repeated log errors (sanitized, deduped by HA core, 24h window), then sends a read-only AI review to the phone (immediate, daily until fixed, clears on recovery)
- 🛌 **Startup / shutdown** — house-level routines for boot and power-down
- 📶 **Zigbee (ZHA)** — sensors and switches on the mesh
- 🍎 **HomeKit** — the house in Apple Home, too

## 🖥️ Custom cards

Hand-rolled Lovelace cards in `www/` — plain JS, no dependencies, no build step:

- 🏡 `home-overview-card.js` — at-a-glance home state, who's here, key toggles
- 🌡️ `heating-control-card.js` — a week view of room heating schedules
- 💷 `agile-rates-card.js` — Octopus Agile rates table

### UI preview

Use direct SSH upload for fast visual iteration. Local repository stays source of truth. HA `/config/www` is preview target only. HACS-owned `www/community/` remains untouched by GitHub deployment.

```sh
node --check www/heating-control-card.js
scp www/heating-control-card.js homeassistant:/config/www/heating-control-card.js
```

Open browser DevTools, enable **Disable cache**, then reload dashboard. Review before another change. Do not commit or push a preview upload directly.

Before final local commit and push, restore previewed files on HA from your local checkout:

```sh
scp www/heating-control-card.js homeassistant:/config/www/heating-control-card.js
```

GitHub Actions validates every push, joins Tailscale, and streams tracked runtime files over SSH. HA `/config` is no longer a Git repository. Git-owned config roots are replaced wholesale, so stale server edits disappear; `secrets.yaml`, HA storage/data, HACS `custom_components/`, and `www/community/` stay untouched.

Deployment applies least disruption:

- custom-card JS: copy + update Lovelace `/local/` resource URLs with current commit query; no reload/restart
- reloadable YAML: targeted Home Assistant reload service; no restart
- structural/unsupported YAML: one restart
- docs/tooling-only changes: no deployment

Changed Lovelace cards become visible on ordinary dashboard refresh. HACS manages third-party integrations such as Octopus Energy separately.

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

- 🔒 **Lefthook** — pre-commit: Prettier, yamllint, JS syntax, ShellCheck, deploy-script syntax, Python unit tests. Pre-push: full HA config check
- ☁️ **GitHub Actions** — validation on every push and PR; direct Tailscale/SSH deploy on `main` runtime changes
- 🧪 **`shell/config_check.sh`** — spins up a real Home Assistant container (default `stable`, pin with `HA_VERSION=x.y`) and runs `check_config` against the repo, using the stubbed secrets
- 🐍 **`shell/test_system_errors_buf.py`** — dependency-free unit tests for the system error buffer logic (runs in pre-commit and CI)
- 📝 **`automations.yaml`** — keeps the automation list in sync
- 🔐 Deployment secrets: `HA_SSH_PRIVATE_KEY` and `HA_TOKEN`; transport is tailnet-only via ephemeral `tag:ci` runner

## 📏 Conventions

- One automation per file, name says what it is 🏷️
- Secrets go in `secrets.yaml` (gitignored) and are mocked in `.stubs/mock_secrets.yaml` for CI
- Templates, input booleans and groups live in `entities/`, not sprinkled through integrations
- Config changes are reviewed like code: commit, push, let CI check it 🐙
