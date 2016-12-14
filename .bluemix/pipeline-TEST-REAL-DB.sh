#!/bin/bash
npm config delete prefix
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.2/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 4.4
npm install
export PATH=$PATH:./node_modules/.bin
./test/test-with-postgresql.sh
