FROM alpine:3.11

RUN apk add bash --no-cache
RUN addgroup -g 1000 -S project && adduser -u 1000 -D -S -G project project --home /var/project

# RUN mkdir /var/utils
# WORKDIR /var/utils
# ADD entrypoint.sh ./
# RUN chown -R 1000:1000 ./ && chmod 500 entrypoint.sh

# ENTRYPOINT ["/var/utils/entrypoint.sh"]

# healthcheck is a command defined in docker_manager

RUN mkdir /var/storage
WORKDIR /var/storage
RUN chown -R 1000:1000 ./

WORKDIR /var/project
RUN mkdir ./logs && mkdir ./build && chown -R 1000:1000 ./

STOPSIGNAL SIGTERM
# default is sigterm, but some images cannot handle it and need to wait timeout to send sigkill
# timeout can be changed on container creation, default is 10s