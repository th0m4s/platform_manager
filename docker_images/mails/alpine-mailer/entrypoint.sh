#!/bin/bash

echo "Checking privileges in mounted mail storage..."
chown -R vmail:vmail /var/mail
echo "Starting dovecot..."
dovecot
echo "Starting postfix..."
touch /var/log/postfix.log
postfix start
echo "Mail services started!"
sleep infinity