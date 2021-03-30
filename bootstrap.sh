#!/bin/bash

set -ex

apt-get update
apt-get upgrade -y

# see: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
apt install --no-install-recommends -y gnupg software-properties-common
apt-key adv --keyserver keyserver.ubuntu.com --recv-key C99B11DEB97541F0
apt-add-repository https://cli.github.com/packages
apt update
apt install --no-install-recommends -y gh jq
npm install -g typescript ts-node