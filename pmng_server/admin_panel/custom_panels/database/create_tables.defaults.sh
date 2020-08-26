#!/bin/bash

admin="__ALLOW_ADMIN"

if [ $admin = "true" ]
then
    echo "Admin allowed"
    mariadb -S __DBSOCKET -u __DBUSER --password="__DBPASS" < /var/project/public/sql/create_tables.sql
fi

mariadb -u __CTRLUSER --password="__CTRLPASS" -h mariadb < /var/project/public/sql/create_tables.sql