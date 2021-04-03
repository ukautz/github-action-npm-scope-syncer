FROM node:14-buster-slim

WORKDIR /app

RUN apt-get update && \
    apt-get upgrade -y
RUN apt-get install --no-install-recommends -y \
    gnupg jq git openssh-client software-properties-common

# see: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-key C99B11DEB97541F0 && \
    apt-add-repository https://cli.github.com/packages && \
    apt-get update && \
    apt-get install --no-install-recommends -y gh
RUN npm install -g typescript ts-node

ADD . .
RUN npm install && npm run test

ENTRYPOINT [ "/app/entrypoint.sh" ]