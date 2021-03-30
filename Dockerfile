FROM node:14-buster-slim

WORKDIR /app

ADD bootstrap.sh .
RUN ./bootstrap.sh

ADD . .
RUN ./install.sh

ENTRYPOINT [ "/app/entrypoint.sh" ]