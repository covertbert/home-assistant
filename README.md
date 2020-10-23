# Home Assistant Configuration

![Home Assistant](https://github.com/covertbert/home-assistant/workflows/Master/badge.svg)

This is my configuration for the [Home Assistant](https://www.home-assistant.io/) platform, which is:

_Open source home automation that puts local control and privacy first. Powered by a worldwide community of tinkerers and DIY enthusiasts. Perfect to run on a Raspberry Pi or a local server._ ~ Home Assistant

## Structure

The philosophy I have taken with my project structure is [similar to that of Frenck](https://github.com/frenck/home-assistant-config), in that I have modularised everything to the extent that each entity has its own file; thus creating a true separation of concerns.

## Project setup

This project uses [pre-commit](https://pre-commit.com/) to format files in a git pre-commit hook in order to maintain consistency.

To get started:

1. Install `pre-commit` with `brew install pre-commit`.

2. Check your `pre-commit` version to make sure it's installed correctly with `pre-commit --version`

3. Install your `pre-commit` scripts with `pre-commit install`

4. Commit your code!

N.B. You can run `pre-commit` across all files with `pre-commit run --all-files`

## CI & Deployment

I have a Github Actions CI pipeline that runs on any new branches that are created.

The pipeline will run `yamllint` to check for syntax errors and to enforce consistency. It also runs my config against a dockerised version of Home Assistant to make sure none of the changes I've made are incompatible with it.

Once a PR/branch has been merged into master it will be deployed by the [Git Pull](https://www.home-assistant.io/addons/git_pull/) addon for HA that polls the master branch for changes.

Changes cannot be pushed directly to the master branch in order to avoid accidentally bypassing the pipeline.
