#!/bin/bash

sed -i "s/listening_port/$PORT/g" /etc/nginx/nginx.conf
echo "Starting server on port $PORT..."
/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf