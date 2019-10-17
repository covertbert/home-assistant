workflow "Check Home Assistant Configuration" {
  on = "push"
  resolves = ["STABLE", "RC", "DEV"]
}

action "STABLE" {
  uses = "ludeeus/action-ha-config-check@master"
  env = {
    ACTION_VERSION = "STABLE"
  }
}

action "RC" {
  uses = "ludeeus/action-ha-config-check@master"
  env = {
    ACTION_VERSION = "RC"
  }
}

action "DEV" {
  uses = "ludeeus/action-ha-config-check@master"
  env = {
    ACTION_VERSION = "DEV"
    ACTION_ALLOW_FAIL = "True"
  }
}