module.exports = {
  "*.{sh,yml,js,json,md,sh}": ["prettier --write"],
  "*.yaml": () => "./scripts/config-check.sh",
}
