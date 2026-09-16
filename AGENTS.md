# Home Assistant UI preview

For changes to `www/*.js`:

1. Validate with `node --check <file>`.
2. Preview with `scp <file> homeassistant:/config/<file>`.
3. Reload dashboard bypassing cache and review result before another change.
4. Do not commit or push until user accepts preview.
5. Before commit or push, restore previewed files by copying repository versions back with `scp`.
6. Confirm preview changes are intentional, then commit and push local repo. GitHub Actions owns deployment over Tailscale/SSH.

Custom-card resource URLs stay as `/local/*.js`; deployment updates their Lovelace URLs to `/local/*.js?v=<commit>` through the supported WebSocket API, so browsers fetch changed cards without an HA restart.
