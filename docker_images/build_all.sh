docker build -t pmng/base ./base-project
docker build -t pmng/node -t pmng/node:14.7.0 ./node/v14
docker build -t pmng/node:13.14.0 ./node/v13
docker build -t pmng/node:12.18.3 ./node/v12
docker build -t pmng/apache2-php7 ./apache-php
docker build -t pmng/nginx-php7 ./nginx-php
docker build -t pmng/mariadb ./alpine-mariadb