docker build -t pmng/base -t pmng/base:alpine3.11 ./base
docker build -t pmng/node -t pmng/node:14.8.0 ./node/v14
docker build -t pmng/node:13.14.0 ./node/v13
docker build -t pmng/node:12.18.3 ./node/v12
docker build -t pmng/node:10.22.0 ./node/v10
docker build -t pmng/apache2-php7 ./apache-php
docker build -t pmng/nginx-php7 ./nginx-php
docker build -t pmng/plugin-mariadb ./alpine-mariadb
docker build -t pmng/panel-pma ./alpine-phpmyadmin