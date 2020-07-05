#!/bin/bash

sed -i "s/listening_port/$PORT/g" /etc/nginx/nginx.conf
echo "Starting server..."
/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf