#!/bin/bash

mariadb -u __DBUSER --password="__DBPASS" -D __DBNAME -S __DBSOCKET < /var/project/public/SQL/mysql.initial.sql