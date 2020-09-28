#!/bin/bash

echo "Checking privileges in mounted mail storage..."
chown -R vmail:vmail /var/mail
echo "Starting dovecot..."
dovecot
echo "Starting postfix..."
postfix start
echo "Mail services started!"
sleep infinity