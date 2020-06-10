#!/bin/bash

cnt=$(netstat -a | grep ":$1" | grep "LISTEN" | wc -l)
if [ $cnt -eq 0 ]; then
        echo "Project failed to bind port or lost connection">%2
        exit 1
else
        exit 0
fi