#!/bin/bash

if [ "$#" -ne 3 ]; then
    echo "Invalid parameters"
    exit 1
fi

name=$1
repo=$2
vers=$3

echo "Installing Roundcube plugin $name..."
dl_name=plugin_$name.tar.gz
mkdir /var/project/public/plugins/$name

echo "Downloading..."
curl -fsSL -o $dl_name "https://github.com/$repo/archive/$vers.tar.gz"
echo "Extracting..."
tar -xzf $dl_name -C /var/project/public/plugins/$name --strip-components=1
echo "Plugin installed."
rm $dl_name