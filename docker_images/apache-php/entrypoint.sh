#!/bin/bash

sed -i "s/Listen 80/Listen $PORT/g" /etc/apache2/httpd.conf
echo "Starting server on port $PORT..."
httpd -DNO_DETACH