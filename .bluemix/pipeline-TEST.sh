#!/bin/bash
npm config delete prefix
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.2/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 4.4
npm install
if [ -z ${COVERALLS_REPO_TOKEN} ]; then
  npm run localcoverage
  echo No Coveralls token specified, skipping coveralls.io upload
else
  npm run coverage
fi
