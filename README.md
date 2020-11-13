# Home Assistant Configuration

![Home Assistant](https://github.com/covertbert/home-assistant/workflows/Master/badge.svg)

This is my configuration for the [Home Assistant](https://www.home-assistant.io/) platform.

_Open source home automation that puts local control and privacy first. Powered by a worldwide community of tinkerers and DIY enthusiasts. Perfect to run on a Raspberry Pi or a local server._ ~ Home Assistant

## Structure

The philosophy I have taken with my project structure is [similar Frenck's](https://github.com/frenck/home-assistant-config), in that I have modularised everything to the extent that each entity has its own file; thus creating a true separation of concerns.

## Development

This project uses [pre-commit](https://pre-commit.com/) to format files in order to maintain consistency.

To get started:

1. Install `pre-commit` with `brew install pre-commit`.

2. Check your `pre-commit` version to make sure it's installed correctly with `pre-commit --version`

3. Install the commit hook scripts with `pre-commit install`

4. Commit your code!

N.B. You can run `pre-commit` manually across all files with `pre-commit run --all-files`

## CI & Deployment

There is a Github Actions CI pipeline that runs on pushes to the `master` branch.

The pipeline will run all `pre-commit` hooks for static analysis and to enforce consistency. It also runs the config against a dockerised version of Home Assistant to make sure none of the changes are incompatible.

If all the checks pass, the pipeline will `rsync` the updated config and restart the server.

### Local deployment

To perform a manual local deployment run `yarn deploy "$user" "$host" "$manualRestartWebhookURL"`. This requires your public `ssh` key to be authorized by the server.
