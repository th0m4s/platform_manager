#!/bin/bash

# run pma tables creation
bash /var/start/create_tables.inc.sh

# run default apache entrypoint
bash /var/start/entrypoint.sh