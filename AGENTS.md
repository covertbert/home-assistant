# Home Assistant UI preview

For changes to `www/*.js`:

1. Validate with `node --check <file>`.
2. Preview with `scp <file> homeassistant:/config/<file>`.
3. Reload dashboard bypassing cache and review result before another change.
4. Do not commit or push until user accepts preview.
5. Before commit or push, run `ssh homeassistant 'cd /config && git status --porcelain'`.
6. Stop if output contains untracked or unexpected paths. Restore only previewed files with `git restore --source=HEAD --staged --worktree -- <file>`.
7. Confirm `git status --porcelain` is empty, then commit and push local repo. GitHub Actions deploy webhook can then pull cleanly.

Deploy script appends current Git commit as `?v=` to every `/local/` resource URL, so production browsers fetch changed custom cards.
