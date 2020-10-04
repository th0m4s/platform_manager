#!/bin/bash

# run rc tables creation
bash /var/start/init_db.inc.sh

# run default apache entrypoint
bash /var/start/entrypoint.sh