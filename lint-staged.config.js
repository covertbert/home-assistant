module.exports = {
  "*.{sh,yml,js,json,md,sh}": ["prettier --write"],
  "*.sh": ["shellcheck"],
  "*.yaml": () => "./scripts/config-check.sh",
}
